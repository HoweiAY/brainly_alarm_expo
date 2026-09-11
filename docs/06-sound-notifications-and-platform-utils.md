# Sound, Notifications & Platform Utilities

This document covers the cross-cutting utilities that back the alarm experience: alarm sound playback, the notification channel/notification UX, custom audio selection, and the Room type converter. These are the platform-level "APIs" the React Native port must reproduce.

> The original Kotlin source referenced by the `Source:` lines below lives in the upstream repository at **https://github.com/HoweiAY/brainly-alarm** (under `app/src/main/java/com/example/alarmapp/`); it is not vendored in this repo.

## 1. Alarm Sound Playback — `AlarmSoundManager`

Source: `utils/AlarmSoundManager.kt`

A **singleton** wrapping Android's `Ringtone` API.

### 1.1 Singleton Construction

```kotlin
class AlarmSoundManager private constructor(private val context: Context?) {
  companion object {
    @Volatile private var instance: AlarmSoundManager? = null
    fun getInstance(context: Context?): AlarmSoundManager =
      instance ?: synchronized(this) {
        instance ?: AlarmSoundManager(context?.applicationContext).also { instance = it }
      }
  }
}
```

- Double-checked locking on the companion object.
- Holds the application context (not an activity context) to avoid leaks.
- The same instance is shared by `MainActivity` (foreground playback control) and `AlarmReceiver` (background fire).

### 1.2 Public API

```kotlin
fun playAlarmSound(sound: String?)
fun stopAlarmSound()
```

#### `playAlarmSound(sound)`

1. If `alarmSound == null` (no ringtone loaded yet):
   - If `sound == null` or `sound == "Default"` → load the system default alarm ringtone via `RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)`.
   - Else → parse `sound` as a `Uri` and load that ringtone (a content URI picked from local storage).
2. Set `isLooping = true`.
3. `play()`.

> **Quirk:** The ringtone is only (re)loaded when `alarmSound == null`. If a previous alarm played a sound, `stopAlarmSound()` nulls it out, so the next `playAlarmSound` will load fresh. A snooze cycle thus correctly loads the right sound. The RN port should mirror this "load on play, null on stop" lifecycle.

#### `stopAlarmSound()`

1. `alarmSound?.stop()`
2. `alarmSound = null`

### 1.3 Lifecycle Hooks

- `MainActivity` holds a reference and exposes `stopAlarmSound = { soundManager?.stopAlarmSound() }` to the Compose tree.
- `MainActivity.onDestroy` calls `soundManager?.stopAlarmSound()` defensively.
- `AlarmReceiver.onReceive` calls `getInstance(context).playAlarmSound(sound)` to start playback from the background.
- Every task-completion path and the "Turn off" / "Snooze" buttons call `stopAlarmSound()`.

### 1.4 RN/Expo Mapping

| Current                                                      | RN/Expo candidate                                                                                                                 | Notes                                                                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Ringtone` looping playback                                  | `expo-av` (`Audio.Sound`) or the newer `expo-audio`                                                                               | Must set `isLooping: true`, `shouldPlay: true`.                                                                                          |
| System default alarm ringtone (`RingtoneManager.TYPE_ALARM`) | No direct cross-platform API; ship a default alarm sound asset, or read the platform default via a native module                  | iOS has no "default alarm sound" concept; bundle a fallback.                                                                             |
| Alarm-category audio routing                                 | Configure the audio session/category as "Alarm" / "Playback" with `AVAudioSessionCategoryAmbient`-style override of silent switch | Critical so alarms sound even when the phone is on silent — this is core to the product.                                                 |
| Background playback while app is launched by the alarm       | Foreground service or the alarm-notification foreground intent                                                                    | iOS: alarm sound playback from a notification is limited; a native module playing sound while the app is briefly backgrounded is needed. |
| Content-URI playback                                         | `expo-av` supports `require()` assets and file URIs; for picked audio, copy to app sandbox first                                  | Android content URIs from `expo-document-picker` may need `FileSystem.copyAsync` to a local path for reliable looping playback.          |

## 2. Custom Alarm Sound Selection

Source: `CreateAlarmMenu.kt` + `CreateAlarmViewModel.updateSoundSelected`.

### 2.1 Picker

```kotlin
val alarmPickerLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.GetContent(),
    onResult = { uri ->
        if (uri != null) {
            alarmSoundSelected = createAlarmViewModel.updateSoundSelected(context, uri)
            alarmSoundUri = uri.toString()
        }
    }
)
// triggered by:
alarmPickerLauncher.launch("audio/*")
```

- Uses the standard Android document/audio picker (mime type `audio/*`).
- The selected `uri` is **persisted as a string** in `Alarm.sound` — it is fed directly back to `RingtoneManager.getRingtone(context, Uri.parse(sound))` at fire time.

### 2.2 Display Name Resolution

`CreateAlarmViewModel.updateSoundSelected(context, uri)`:

```kotlin
val cursor = context.contentResolver.query(soundUri, null, null, null)
cursor?.use {
    if (it.moveToFirst()) {
        sound = it.getString(it.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME))
    }
}
// updates UI state: alarmSoundSelected = sound, alarmSoundUri = soundUri.toString()
return sound
```

Resolves the human-readable filename (e.g. `"morning_alarm.mp3"`) for display in the form.

### 2.3 Persistence Caveat

- The content URI is persisted in the database **as-is** with no persistent-permission grant. On Android, content URIs from the picker are typically only usable for the lifetime of the receiving process unless `takePersistableUriPermission` is called.
- The current app does **not** call `takePersistableUriPermission`, so a custom sound selected today may fail to play on a future alarm fire after the process restarts.
- **RN port must** take a persistable URI permission (Android) or copy the picked audio into the app sandbox (cross-platform) to guarantee long-term playback.

### 2.4 Required Permission

`AndroidManifest.xml` declares `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` for accessing local audio. On Android 13+ the granular `READ_MEDIA_AUDIO` permission is the correct one; the current `targetSdk = 34` app does not declare it (a latent bug). The RN port should request the appropriate media permission at runtime.

## 3. Notifications

Sections 3.1–3.3 describe the original Android app. Section 3.4 specifies the implemented Expo architecture.

### 3.1 Channel

Created in `MainActivity.createNotificationChannel()` (runs on every `onCreate`):

```kotlin
channelId   = "brainly_alarm_id"
channelName = "brainly_alarm"
importance  = NotificationManager.IMPORTANCE_HIGH
```

`IMPORTANCE_HIGH` makes the notification pop heads-up and sound (though the alarm sound itself is driven by `AlarmSoundManager`, not the notification).

### 3.2 Alarm Notification

Built in `AlarmReceiver.onReceive`:

```kotlin
NotificationCompat.Builder(context, "brainly_alarm_id")
    .setSmallIcon(R.drawable.ic_launcher_foreground)
    .setContentTitle("Time to wake up!")
    .setContentText("Click to turn off the alarm.")
    .setContentIntent(pendingIntent)         // opens MainActivity on the alarm flow
    .setAutoCancel(true)
    .setPriority(NotificationCompat.PRIORITY_HIGH)
    .setCategory(NotificationCompat.CATEGORY_ALARM)
notificationManager.notify(1, builder.build())
```

- Notification id: **`1`** (single-slot; a new alarm overwrites a previous notification).
- Category `CATEGORY_ALARM` lets the OS treat it as a critical alarm (relevant for Do-Not-Disturb exemption on newer Android).
- The `PendingIntent` wraps the same `MainActivity` intent that is also passed to `startActivity`, so tapping the notification opens the dismissal flow.

### 3.3 Cancellation

`MainActivity.onResume` cancels notification id `1`:

```kotlin
val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
nm.cancel(1)
```

So the alarm notification clears as soon as the user foregrounds the app.

### 3.4 Expo Implementation

#### Android ownership

- `AlarmNotificationManager.kt` is the single owner of Android channel creation and foreground-notification construction. `AlarmSoundService` delegates notification work to it and remains responsible only for foreground-service/audio lifecycle.
- Channel id remains `"brainly_alarm_id"`. The manager configures `IMPORTANCE_HIGH`, vibration, DND bypass request, public lock-screen visibility, no badge, and `sound = null`; the foreground notification uses id `4269`, `CATEGORY_ALARM`, `PRIORITY_MAX`, full-screen/content deep-link intents, and `ongoing = true`.
- `AlarmReceiver` validates the firing snapshot, starts `AlarmSoundService`, launches the alarm deep link, and emits `onAlarmFired` when the React Native module instance is available. There is no native `onAlarmDismissed` event; JS dismissal directly stops sound and clears delivered notifications.

#### Localization and channel synchronization

- `src/notifications/alarmNotificationCopy.ts` contains pure i18n copy lookup and has no Expo side effects. Snapshot creation stores localized title/body so scheduled alarms retain the copy selected when they were registered.
- Native boot/service paths cannot rely on React Native. `AlarmNotificationCopy.kt` therefore stores supported fallback values in a locale-keyed hash map and resolves missing/unsupported language keys to English.
- `src/notifications/AlarmNotifications.ts` owns the Expo foreground handler, permission checks, native channel synchronization, and delivered-notification cleanup; `useAlarmNotifications` owns received/response subscriptions. `syncAlarmNotificationChannel()` delegates the active localized channel name to native `syncNotificationChannel(channelName)` rather than configuring the same Android channel a second time through Expo.
- Initialization synchronizes the native channel before checking notification permission, then requests permission only when it is neither granted nor provisionally authorized. Changing language synchronizes the channel and reconciles weekly schedule snapshots.

#### Cross-platform delivery

- Android exact wake-up and foreground notification delivery are native. Expo notification received/response listeners remain for the iOS local-notification path and route valid snapshots into the same alarm activation flow.
- `clearDeliveredAlarmNotifications()` runs after notification responses, native dismissal flows, and app foreground transitions. Alarm sound is controlled separately through `playAlarmSound` / `stopAlarmSound`.

## 4. Room Type Converter — `TypeConverter`

Source: `utils/TypeConverter.kt`

A single `@TypeConverter` class registered on the `Alarm` entity via `@TypeConverters(com.example.alarmapp.utils.TypeConverter::class)`:

```kotlin
@TypeConverter fun listToString(list: List<String>): String = list.joinToString(",")
@TypeConverter fun stringToList(string: String): List<String> = string.split(",")
```

Serializes the `days: List<String>` column to/from a CSV string in the `alarms` table.

### 4.1 Edge Cases

- An **empty list** serializes to the empty string `""`, and `"".split(",")` returns `[""]` (a list with one empty string) — a subtle bug. In practice the app treats an empty `days` list as "every day" at scheduling/confirm time, so the stored CSV is rarely empty, but the round-trip is not strictly symmetric.
- No escaping is applied, so any weekday abbreviation containing a comma would corrupt the list. The current `weekdays` constant set is comma-free, so this is not an active bug.

### 4.2 RN Port Recommendation

Store `days` as a **JSON array string** column (or a native JSON column with `expo-sqlite`'s JSON1 support). This removes the empty-string asymmetry and any separator-collision risk. Recommended `days` representation in the TS model: `("Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat"|"Sun")[]`.

## 5. Sensors

Only the `PhoneShaking` task uses sensors (`SensorManager` + `Sensor.TYPE_ACCELEROMETER`). See `docs/05-dismissal-tasks.md` §3 for the full spec. The corresponding RN module is `expo-sensors` → `Accelerometer`.

## 6. Math Evaluation — exp4j

Source: `MathEquation.kt` imports `net.objecthunter:exp4j:0.4.8` (declared in `app/build.gradle.kts`).

```kotlin
ExpressionBuilder(expression).build().evaluate().toInt()
```

- Used **only** in `MathEquation.evaluateExpression`.
- Input is always generated by `generateEquation`, so it is constrained to digits, `+`, `-`, `*`, and spaces.
- The RN replacement should validate the input with `/^[\d+\-*\s]+$/` before evaluating to preserve the same trust boundary.

## 7. Permissions Summary

From `AndroidManifest.xml`:

| Permission               | Used by                                                  |
| ------------------------ | -------------------------------------------------------- |
| `POST_NOTIFICATIONS`     | Alarm foreground notification (Android 13+).             |
| `READ_EXTERNAL_STORAGE`  | Reading custom alarm audio via the picker.               |
| `WRITE_EXTERNAL_STORAGE` | Declared but effectively unused by the app's code path.  |
| `SCHEDULE_EXACT_ALARM`   | `AlarmManager.setExactAndAllowWhileIdle`.                |
| `USE_EXACT_ALARM`        | Same — declared for Android 14+ exact-alarm attestation. |

### RN Port Permission Plan

| Permission                                      | Expo module                                                                                                                                                                                                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notifications + alarm scheduling                | `expo-notifications` checks/requests notification authorization and observes iOS delivery; the native scheduler owns Android exact wake-up alarms and channel configuration. `requestExactAlarmPermission()` opens the Android exact-alarm settings flow. |
| Audio file access                               | `expo-document-picker` + sandbox copy avoids persistent storage permissions on modern Android.                                                                                                                                                            |
| Foreground service for alarm playback (Android) | `AlarmSoundService` keeps playback alive while `AlarmNotificationManager` supplies its required ongoing foreground notification.                                                                                                                          |
| Override DND / silent                           | Android uses `CATEGORY_ALARM`, a silent high-importance channel, and `AudioAttributes.USAGE_ALARM` for the separate looping player. iOS retains platform silent/Focus limitations.                                                                        |
