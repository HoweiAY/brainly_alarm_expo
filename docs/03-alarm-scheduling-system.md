# Alarm Scheduling & Triggering System

This document specifies the alarm scheduling engine: how alarms are registered with the OS, how they fire, how they are cancelled, snoozed, and re-scheduled. This is the most platform-coupled subsystem and the most critical part to map onto React Native + Expo.

> The original Kotlin source referenced by the `Source:` lines below lives in the upstream repository at **https://github.com/HoweiAY/brainly-alarm** (under `app/src/main/java/com/example/alarmapp/`); it is not vendored in this repo.

## 1. Component Map

| Component           | Source                               | Role                                                                                                     |
| ------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `AlarmViewModel`    | `components/alarm/AlarmViewModel.kt` | Schedules/cancels alarms with `AlarmManager`. Pure scheduling logic — no persistence.                    |
| `AlarmReceiver`     | `components/alarm/AlarmReceiver.kt`  | `BroadcastReceiver` invoked by `AlarmManager` when an alarm is due.                                      |
| `AlarmSoundManager` | `utils/AlarmSoundManager.kt`         | Singleton that plays/stops the looping alarm `Ringtone`.                                                 |
| `AlarmDisplay`      | `components/alarm/AlarmDisplay.kt`   | Triggered-alarm UI screen; routes the user to the dismissal task.                                        |
| `MainActivity`      | `MainActivity.kt`                    | Entry point; reads the `alarmTriggered` extra to decide whether to open the alarm flow or the home flow. |

## 2. Scheduling an Alarm — `AlarmViewModel.setAlarm`

```kotlin
fun setAlarm(alarm: Alarm, reset: Boolean = false, snoozed: Boolean = false)
```

### 2.1 Algorithm

1. Obtain the `AlarmManager` system service.
2. For each weekday in `alarm.days` (mapped to `Calendar` day-of-week constants):
   1. Build a `Calendar` set to **today**, with `HOUR_OF_DAY = alarm.hour`, `MINUTE = alarm.minute`, `SECOND = 0`, `MS = 0`.
   2. If that time has already passed today, advance the calendar's day-of-week by 1.
   3. Construct an `Intent` targeting `AlarmReceiver`, carrying the full alarm snapshot as extras (see §3).
   4. Compute a `requestCode` = `"$alarmId$dayOfWeek".hashCode()` (a stable per (alarm, weekday) integer). For snoozed alarms, `requestCode = 0` so the snooze pending intent never collides with weekly ones.
   5. Build a `PendingIntent.getBroadcast(...)` with `FLAG_IMMUTABLE | FLAG_UPDATE_CURRENT`.
   6. Compute the final trigger time:
      - Default: `calendar.timeInMillis` (next upcoming slot for this weekday).
      - `reset = true`: add **7 days** (reschedules the same weekday next week after dismissal).
      - `snoozed = true`: `now + 5 minutes`.
   7. `alarmManager.setExactAndAllowWhileIdle(RTC_WAKEUP, triggerTime, pendingIntent)`.

### 2.2 Key Invariants

- One `PendingIntent` per (alarm id, weekday) → multi-day alarms fire independently per weekday and can be cancelled independently.
- The alarm payload is **snapshotted into the Intent extras** at scheduling time. Editing the `Alarm` row in the database does **not** update a scheduled alarm — the caller must `cancelAlarm` then `setAlarm` again. `CreateAlarmMenu.Confirm` and `HomeMenu.AlarmCard` switch follow this pattern.
- `RTC_WAKEUP` + `setExactAndAllowWhileIdle` => the device wakes up and the alarm fires even in Doze.
- Snooze reuses `requestCode = 0`, so at most one snooze is pending per alarm at a time; scheduling a new snooze overwrites the previous one (because of `FLAG_UPDATE_CURRENT`).

## 3. Alarm Payload (Intent Extras)

Extras carried by the broadcast `Intent` and re-read by `AlarmReceiver`:

| Extra key        | Type      | Meaning                                                  |
| ---------------- | --------- | -------------------------------------------------------- |
| `alarmId`        | `Int`     | The `Alarm.id`.                                          |
| `dayOfWeek`      | `Int`     | `Calendar` weekday constant the alarm was scheduled for. |
| `hour`           | `Int`     | 0–23.                                                    |
| `minute`         | `Int`     | 0–59.                                                    |
| `task`           | `String`  | Dismissal task type.                                     |
| `roundCount`     | `Int`     | Number of rounds.                                        |
| `difficulty`     | `String`  | Easy/Normal/Hard.                                        |
| `sound`          | `String`  | `"Default"` or a content-URI string.                     |
| `snooze`         | `Boolean` | Whether snooze is allowed.                               |
| `enabled`        | `Boolean` | Whether the alarm is enabled.                            |
| `isSnoozed`      | `Boolean` | `true` if this firing is a snooze.                       |
| `alarmTriggered` | `Boolean` | Hint for the launched Activity to enter the alarm flow.  |

## 4. Firing — `AlarmReceiver.onReceive`

1. Read the current `DAY_OF_WEEK`, `HOUR_OF_DAY`, `MINUTE`.
2. Read all extras from the intent.
3. **Guard:** fire only if `(today == day && hour == currentHour && minute == currentMinute) || isSnoozed`. This prevents stale alarms from firing (e.g. if the device was off and a batch of alarms are queued).
4. Build an `Intent` to `MainActivity` with all extras + `alarmTriggered=true`, plus `FLAG_ACTIVITY_NEW_TASK`.
5. Create a high-priority notification on channel `brainly_alarm_id` ("Time to wake up!" / "Click to turn off the alarm.") with a `PendingIntent` that opens `MainActivity`.
6. `AlarmSoundManager.getInstance(context).playAlarmSound(sound)` — starts the looping ringtone.
7. `context.startActivity(alarmScreenIntent)` — brings the app to the foreground on the dismissal screen.

## 5. Cancellation — `AlarmViewModel.cancelAlarm`

```kotlin
fun cancelAlarm(alarm: Alarm, isSnoozed: Boolean)
```

- Iterates each weekday in `alarm.days`, rebuilds the matching `PendingIntent` (same `requestCode` formula) and calls `alarmManager.cancel(pendingIntent)`.
- If `isSnoozed`, cancels the `requestCode = 0` snooze pending intent instead.

## 6. Dismissal & Reschedule Flow

The full lifecycle from scheduling → firing → dismissal → weekly reschedule:

```
CreateAlarmMenu.Confirm
  └─> insertAlarm/updateAlarm (DB)
  └─> cancelAlarm(old) ─────────────────────────────────────────┐
  └─> setAlarm(alarm)  ──[AlarmManager schedules PendingIntent]─┐
                                                                │
        ... time passes ...                                     │
                                                                ▼
AlarmManager fires  ─► AlarmReceiver.onReceive
                        ├─ validates day/hour/min match
                        ├─ posts notification
                        ├─ AlarmSoundManager.playAlarmSound(sound)
                        └─ startActivity(MainActivity, alarmTriggered=true)
                                                                │
                                                                ▼
MainActivity.onCreate
  └─ reads intent.alarmTriggered → NavHost startDestination = "AlarmScreen"
                                                                │
                                                                ▼
AlarmDisplay
  ├─ reads alarm snapshot from intent extras + loads Alarm from DB (getAlarmById)
  ├─ "Begin task" button:
  │     resetAlarm(...)            // cancel current weekday PI, re-schedule +7d if enabled
  │     updateAlarm(DB)
  │     navigate to MemoryGame / MathEquation / PhoneShaking (or dismiss if task=None)
  └─ "Snooze for 5 minutes" button:
        stopAlarmSound()
        cancelAlarm(isSnoozed=true)
        updateAlarm(DB)
        setAlarm(snoozed=true)    // PI requestCode=0, fires now+5min
        Toast("Alarm snoozed for 5 minutes")
        onAlarmDismissed()        // back to Home
                                                                │
Task completion (MemoryGame/MathEquation/PhoneShaking)          │
  └─> stopAlarmSound() + AlarmViewModel.onAlarmDismissed(context)
        └─> startActivity(MainActivity, alarmTriggered=false) ──► Home
```

### 6.1 `resetAlarm` helper (in `AlarmDisplay.kt`)

```
resetAlarm(...):
  cancelAlarm(updatedAlarm(...), isSnoozed=false)     // cancel this weekday's PI
  if (enabled):
      setAlarm(updatedAlarm(...), reset=true, snoozed=false)   // re-arm +7 days
```

`updatedAlarm(...)` recomputes a single-weekday `Alarm` snapshot from the intent extras (handles hour overflow when minute rolls past 60, etc.). It is a defensive reconstruction of the firing alarm, used for the reschedule.

## 7. `onAlarmDismissed`

```kotlin
fun onAlarmDismissed(context: Context?) {
  val intent = Intent(context, MainActivity::class.java)
  intent.putExtra("alarmTriggered", false)
  intent.addFlags(FLAG_ACTIVITY_CLEAR_TOP | FLAG_ACTIVITY_NEW_TASK)
  context?.startActivity(intent)
}
```

Used by every task-completion path and by the None/turn-off path to return the user to the Home screen and clear the alarm activity stack.

## 8. Notification Channel

### 8.1 Original Android app

- Created in `MainActivity.createNotificationChannel()`:
  - id: `"brainly_alarm_id"`
  - name: `"brainly_alarm"`
  - importance: `IMPORTANCE_HIGH`
- The alarm notification uses id `1` and is cancelled in `MainActivity.onResume` so it disappears when the user opens the app.

### 8.2 Expo implementation

- `AlarmNotificationManager` is the single Android owner of channel configuration and foreground-notification construction. This keeps channel creation available to boot and alarm-fire paths that run before React Native is loaded.
- The channel retains id `"brainly_alarm_id"`, `IMPORTANCE_HIGH`, vibration, DND bypass request, public lock-screen visibility, no badge, and no notification sound. Alarm audio is played separately by `AlarmSoundService` on `USAGE_ALARM`.
- `AlarmSoundService` uses foreground notification id `4269` and delegates notification creation to the manager.
- `syncNotificationChannel(channelName)` lets the TypeScript notification service update the localized channel name through the native owner. Initialization synchronizes the channel before checking/requesting notification permission, as required for the Android 13 permission flow.
- Notification snapshots carry localized `notificationTitle` and `notificationBody`. Native boot/service fallbacks are held in a locale-keyed map (`"en"`, `"zh-Hant"`) with English as the default for missing or unsupported languages.
- JS dismissal directly stops playback and clears delivered notifications. The redundant `forceDismissFiring` method and `onAlarmDismissed` event are not part of the bridge; `onAlarmFired` is the only native event.

## 9. Manifest Registration

- `AlarmReceiver` is declared `exported=true`, `directBootAware=true`, with an intent filter for `BOOT_COMPLETED`.
  > The receiver listens for boot, but **no boot-handling logic actually re-schedules alarms**. After a device reboot, previously scheduled `PendingIntent`s survive (they are OS-managed), but alarms that were due while the device was off are dropped. **A RN port should implement explicit re-arming on boot via a persisted alarm list.**
- The Expo implementation addresses this gap with a dedicated `BootReceiver`, which reads enabled alarms and the persisted language from the shared SQLite database, resolves localized notification fallback copy, and re-registers each weekly occurrence through the same scheduling functions used by the native module.

## 10. Mapping to React Native + Expo

| Current (Android)                        | RN/Expo candidate                                                                                        | Notes                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AlarmManager.setExactAndAllowWhileIdle` | `expo-notifications` `Notifications.scheduleNotificationAsync` with a trigger, or a custom native module | Expo's high-level scheduling API does not give exact wake-up alarms with the same guarantees. For Alarmy-style behavior, a **custom native module** wrapping `AlarmManager` (Android) and `UNUserNotificationCenter` + background tasks (iOS) is recommended. iOS imposes a strict ~64-notification limit and does not support exact-time triggers — the iOS UX will differ.   |
| `BroadcastReceiver`                      | Headless JS task (`expo-task-manager`) or the native module's on-fire callback                           | The receiver currently launches an Activity. RN equivalent: emit an event / show a foreground notification that opens the app.                                                                                                                                                                                                                                                 |
| `PendingIntent` per (alarm, weekday)     | One scheduled notification per (alarm, weekday)                                                          | Same request-code scheme can be reused as the notification identifier.                                                                                                                                                                                                                                                                                                         |
| `Ringtone` looping                       | `expo-av` / `expo-audio` looping playback                                                                | Must support background/lock-screen playback and overriding silent mode for alarm sounds.                                                                                                                                                                                                                                                                                      |
| Boot re-arming                           | Persist alarm list in SQLite; on `BOOT_COMPLETED` re-register all enabled alarms                         | Requires a native module + persisted store; not implemented in the original Kotlin app (https://github.com/HoweiAY/brainly-alarm).                                                                                                                                                                                                                                             |
| 5-minute snooze                          | Re-schedule a one-shot alarm `now + N min`                                                               | Direct equivalent. In the RN port `N` is the user-configurable **snooze duration** setting (1–60 minutes, default 5) persisted in the `settings` table and read via `settingsStore` in `snoozeAlarm()` (`src/alarms/scheduling.ts`). The trigger time is computed in JS (`snoozeTriggerTime`) and passed to the native module as `triggerAt`, so no native changes are needed. |

### 10.1 Implemented RN Module API

```ts
interface AlarmScheduler {
  scheduleWeekly(opts: {
    identifier: string;
    weekday: number; // Mon=0 .. Sun=6
    hour: number;
    minute: number;
    payload: AlarmSnapshot;
  }): Promise<string>;

  scheduleOneShot(opts: {
    identifier: string;
    triggerAt: number; // epoch ms
    payload: AlarmSnapshot;
  }): Promise<string>;

  cancel(identifier: string): Promise<void>;
  cancelAllForAlarm(alarmId: string): Promise<void>;
  requestExactAlarmPermission(): Promise<boolean>;
  syncNotificationChannel(channelName: string): Promise<void>;
  playAlarmSound(soundUri: string | null): Promise<void>;
  stopAlarmSound(): Promise<void>;
  addListener(
    type: "onAlarmFired",
    callback: (payload: AlarmSnapshot) => void,
  ): EventSubscription;
}
```

`identifier` and `payload` are the canonical schedule inputs. The bridge no longer repeats `alarmId` or `soundUri` beside the payload; Android derives a custom playback URI from `payload.sound` and maps `"Default"` to the system alarm tone. Weekly rescheduling and snooze orchestration remain TypeScript responsibilities in `src/alarms/scheduling.ts` rather than native bridge methods.

### 10.2 Implementation Constraints and Status

1. **iOS exact alarms** — iOS has no exact-alarm primitive; the Swift implementation uses `UNCalendarNotificationTrigger` / `UNTimeIntervalNotificationTrigger` and accepts degraded delivery behavior.
2. **Doze / exact-alarm permission** — Android scheduling uses `AlarmManager`; `requestExactAlarmPermission()` opens the platform exact-alarm settings flow on Android 12+ when required and scheduling falls back to inexact delivery if permission is unavailable.
3. **Boot persistence** — implemented by `BootReceiver` using the persisted SQLite alarm rows.
4. **Stale-alarm guard** — implemented in `AlarmReceiver`; weekly alarms fire only when weekday/hour/minute match, while snoozed one-shots bypass the guard.
5. **Sound over DND / silent** — Android playback runs in `AlarmSoundService` with `AudioAttributes.USAGE_ALARM`; the notification itself is silent to avoid duplicate sound.
