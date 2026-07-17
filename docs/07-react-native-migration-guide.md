# React Native + Expo Migration Guide

This document is the actionable plan for re-implementing Brainly Alarm in React Native + Expo. It synthesizes the per-subsystem findings from docs 01–06 into a single recommended architecture, library list, native-module surface, and phased plan.

## 1. Recommended Library Stack

| Concern | Recommended Library | Rationale |
|---|---|---|
| Framework | **Expo (managed workflow, dev-client for native)** | Best DX; `expo prebuild` to eject native code when the custom alarm module demands it. |
| Navigation | **`expo-router`** (file-based routing, the default Expo navigation solution) | Replaces the nested `MainStack`/`AlarmStack` Compose graph with route groups `(main)`/`(alarm)` and per-group `_layout.tsx` (see doc 04 §7.1). Built on `react-navigation` but config-driven, so no imperative navigator setup. |
| State management | **Zustand** (+ `immer`) | Lightweight, mirrors the per-screen `ViewModel` + `StateFlow` pattern. One store per screen, one shared alarm store. |
| Local DB | **`expo-sqlite`** (SQL) or **WatermelonDB** (reactive ORM) | WatermelonDB gives the reactive `observeAllAlarms()` the current `LiveData` provides; `expo-sqlite` is lighter. Pick WatermelonDB if you want the reactivity for free. |
| Alarm scheduling | **Custom native module** (`expo-modules-core`) wrapping Android `AlarmManager` + iOS `UNUserNotificationCenter` | No Expo library gives exact, wake-up, recurring alarms with Alarmy-level guarantees. See §2. |
| Sound playback | **`expo-audio`** (newer) or `expo-av` | Looping playback; route to alarm audio category. |
| Audio picking | **`expo-document-picker`** + `expo-file-system` copy to sandbox | Avoids storage permissions; guarantees long-term playback (fixes the persisted-URI bug in doc 06 §2.3). |
| Sensors | **`expo-sensors` (`Accelerometer`)** | Drop-in for the shake task. |
| Notifications | **`expo-notifications`** | Channel creation, scheduling, dismissal. |
| Date/time | **`date-fns`** + native `Date` | Replaces `java.util.Calendar` weekday arithmetic. |
| Math evaluation | Hand-written tokenizer (no external dep) | Controlled, safe, ~50 LOC. |
| Permissions | **`expo-notifications`** + `expo-modules-autolinking` for exact-alarm | See doc 06 §7. |
| Build / CI | EAS Build (`eas build --profile development/production`) | Prebuild + native module compilation. |

## 2. Native Module Surface (Required)

The following native capabilities have no Expo/React-Native cross-platform equivalent and **must** be implemented as a custom Expo module (`expo-modules-core`) or a config plugin + bare native code:

### 2.1 `AlarmSchedulerModule`

```ts
interface AlarmScheduler {
  // Schedule one exact wake-up alarm for (alarmId, weekday) at HH:MM next occurrence.
  scheduleWeekly(opts: {
    alarmId: number;
    weekday: number;       // 0=Sun .. 6=Sat  (pick a convention; Cal uses 1..7)
    hour: number;          // 0..23
    minute: number;        // 0..59
    soundUri: string | null;
    payload: AlarmSnapshot;
  }): Promise<string>;     // returns OS identifier

  // One-shot alarm at absolute epoch ms (used by snooze: now + 5min).
  scheduleOneShot(opts: {
    alarmId: number;
    triggerAt: number;     // epoch ms
    soundUri: string | null;
    payload: AlarmSnapshot;
  }): Promise<string>;

  cancel(identifier: string): Promise<void>;
  cancelAllForAlarm(alarmId: number): Promise<void>;
  rescheduleWeekly(alarm: Alarm): Promise<void>;
  requestExactAlarmPermission(): Promise<boolean>; // Android 12+ SCHEDULE_EXACT_ALARM
}
```

- **Android:** wraps `AlarmManager.setExactAndAllowWhileIdle(RTC_WAKEUP, ...)`, one `PendingIntent` per (alarmId, weekday) using the same `"${alarmId}${weekday}".hashCode()` request-code scheme as the Kotlin app (doc 03 §2). On fire, send a broadcast that (a) starts a foreground service to loop the alarm sound and (b) posts the high-priority `CATEGORY_ALARM` notification that opens the app on `AlarmDisplay`.
- **iOS:** no exact alarms. Use `UNCalendarNotificationTrigger` with `repeats: true` per weekday, accept the ~64-scheduled-notification limit, and a degraded UX (notification sound only; user opens app to perform the dismissal task). Document this limitation clearly.
- **Boot persistence:** on `BOOT_COMPLETED` (Android), re-register every enabled alarm from the SQLite store. The original Kotlin app (https://github.com/HoweiAY/brainly-alarm) does **not** do this — the RN port should fix it.

### 2.2 `AlarmSoundModule` (or fold into `AlarmSchedulerModule`)

- Loop an alarm sound (asset or local file URI) on the alarm audio stream, overriding silent/DND where the platform allows.
- Singleton lifecycle (load on play, release on stop) matching `AlarmSoundManager`.

### 2.3 Foreground Service (Android)

While an alarm is ringing, run a foreground service so the sound keeps playing even if the user backgrounds the app, and so the system does not kill the process mid-task.

## 3. Recommended Project Structure

> This is an **Expo Router** layout: routes are files under `app/` and groups (`(main)`/`(alarm)`) replace the imperative navigators. Non-route code lives in sibling folders outside `app/`.

```
app/                                 # Expo Router routes (file-based)
├─ _layout.tsx                       # root <Stack>; redirects to (main) or (alarm) on launch
├─ (main)/                           # main-flow group (name not in URL)
│  ├─ _layout.tsx                    # <Stack> with slide/fade transitions
│  ├─ index.tsx                      # Home
│  └─ create-alarm/
│     ├─ index.tsx                   # create new alarm
│     └─ [alarmId].tsx               # edit existing alarm
└─ (alarm)/                          # alarm-flow group (modal presentation)
   ├─ _layout.tsx                    # <Stack presentation="fullScreenModal">
   ├─ index.tsx                      # AlarmDisplay (params: alarmSnapshot)
   └─ tasks/
      ├─ memory-game/[rounds]/[difficulty].tsx
      ├─ math-equation/[rounds]/[difficulty].tsx
      └─ phone-shaking.tsx
src/
├─ components/
│  ├─ AlarmCard.tsx
│  ├─ WeekdayTextButton.tsx
│  └─ ResultIcon.tsx
├─ store/
│  ├─ alarmStore.ts                # all alarms (reactive), mirrors AlarmDatabaseViewModel
│  ├─ homeStore.ts                 # HomeUiState equivalent
│  └─ createAlarmStore.ts          # CreateAlarmUiState equivalent
├─ data/
│  ├─ types.ts                     # Alarm, AlarmSnapshot, enums (weekdays, taskTypes, difficulties)
│  ├─ db.ts                        # expo-sqlite / WatermelonDB setup + migrations
│  ├─ alarmRepository.ts           # CRUD; mirrors AlarmRepository + DAO
│  └─ constants.ts                # weekdays, taskTypes, taskDifficulties
├─ alarms/
│  ├─ AlarmScheduler.ts            # wraps the native module
│  ├─ scheduling.ts               # setAlarm/cancelAlarm/resetAlarm/snooze logic
│  └─ sound.ts                    # AlarmSoundManager equivalent (over the native module)
├─ tasks/
│  ├─ memoryGame.ts                # game loop helpers (pure, testable)
│  ├─ mathEquation.ts             # generateEquation + evaluateExpression (pure)
│  └─ phoneShaking.ts            # threshold/debounce constants + shake counter
├─ utils/
│  ├─ time.ts                     # HH:mm formatting, weekday deltas, next-alarm countdown
│  └─ permissions.ts
└─ native/
   └─ alarm-scheduler/             # the Expo native module (TS + Kotlin/Swift)
```

## 4. State Management Strategy

- **`alarmStore` (shared):** holds `alarms: Alarm[]` and exposes:
  - `loadAlarms()`, `insertAlarm`, `updateAlarm`, `deleteAlarm`, `getAlarmById`.
  - A subscription so screens re-render on changes (Zustand `subscribeWithSelector` or WatermelonDB `withObservables`). This replaces `LiveData<List<Alarm>>`.
- **`homeStore`:** mirrors `HomeUiState` (doc 04 §6.1): `optionsExpanded`, `alarmEditEnabled`, `selectedAlarms`, `enabledAlarms`, `nextAlarmDay/Hour/Minute`, `nextAlarmMsg`, plus the toggle flags. Actions: `selectOptions`, `dismissDropdown`, `toggleAlarmEnabled`, `enableAllAlarms`, `toggleAlarmSelected`, `selectAllAlarms`, `cancelAlarmsEdit`, `updateNextAlarm`, `updateNextAlarmMsg`.
- **`createAlarmStore`:** mirrors `CreateAlarmUiState` (doc 04 §6.2): `alarmId`, `weekdaysSelected`, `hourSelected`, `minuteSelected`, `taskSelected`, `roundsSelected`, `difficultySelected`, `alarmSoundSelected`, `alarmSoundUri`, `snoozeEnabled`, `taskSelectorExpanded`. Actions: `reset`, `expandTaskSelector`, `updateWeekdays`, `updateTaskSelected`, `updateRoundCount`, `updateTaskDifficulty`, `updateSoundSelected`, `updateSnoozeEnabled`.
- **Time-polling effects:** the per-minute `HomeMenu` countdown and the per-second `AlarmDisplay` clock become `setInterval` loops inside `useEffect`, cleaned up on unmount.

## 5. Data Model (TypeScript)

```ts
export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type TaskType = "Memory" | "Math" | "Shake phone" | "None";
export type Difficulty = "Easy" | "Normal" | "Hard";

export interface Alarm {
  id: number;            // auto-increment PK
  days: Weekday[];       // [] === every day (resolved at schedule time)
  hour: number;          // 0..23
  minute: number;        // 0..59
  task: TaskType;
  rounds: number;        // 1..5
  difficulty: Difficulty;
  sound: string;         // "Default" or a file:// URI inside the sandbox
  snooze: boolean;
  enabled: boolean;
}

// The serialized snapshot carried by the native scheduler / notification payload.
export interface AlarmSnapshot {
  alarmId: number;
  weekday: number;       // 0..6 (platform-calendar-style)
  hour: number;
  minute: number;
  task: TaskType;
  roundCount: number;
  difficulty: Difficulty;
  sound: string;
  snooze: boolean;
  enabled: boolean;
  isSnoozed: boolean;
}
```

- Store `days` as a **JSON array** column (not CSV — fixes the `TypeConverter` edge cases in doc 06 §4).
- Use the exact same `taskTypes` / `taskDifficulties` ordering so the index-based logic in `AlarmDisplay` (e.g. `task == taskTypes[3]` for "None", `taskTypes[2]` for "Shake phone") carries over — or, preferably, replace index checks with explicit enum comparisons in the port for readability.

## 6. Phased Migration Plan

### Phase 0 — Foundations (1 week)
- `npx create-expo-app@latest --template tabs` (TypeScript) or `npx create-expo-app` then `npx expo install expo-router` (dev-client build).
- Set up the **Expo Router** skeleton: `app/_layout.tsx`, `app/(main)/`, `app/(alarm)/` groups with empty route files matching doc 04 §7.1. Configure the `(alarm)` group as `fullScreenModal`.
- Set up Zustand stores (empty) and `expo-sqlite`/WatermelonDB schema for the `alarms` table.
- Implement `alarmRepository` CRUD against the DB.

### Phase 1 — Static UI parity (1–2 weeks)
- Implement `app/(main)/index.tsx` (Home), `app/(main)/create-alarm/index.tsx` + `[alarmId].tsx`, `AlarmCard`, `WeekdayTextButton` as pure UI wired to the stores, no alarms yet. Navigation via `router.push` / `router.back`.
- Implement `app/(alarm)/index.tsx` (AlarmDisplay: clock + buttons, no real trigger).
- Implement the three task route screens (`app/(alarm)/tasks/...`) with their game loops (pure TS in `src/tasks/`).
- Visual/UX parity with the Compose app.

### Phase 2 — Persistence + scheduling (2–3 weeks)
- Build the `AlarmScheduler` native module (Android first).
- Wire `setAlarm`/`cancelAlarm`/`resetAlarm`/`snooze` in `src/alarms/scheduling.ts`.
- Implement the foreground service + `AlarmSoundManager` equivalent.
- End-to-end Android alarm fire → `AlarmDisplay` → task → dismiss → weekly reschedule.
- Add boot re-arming.

### Phase 3 — Sound + notifications (1 week)
- `expo-notifications` channel setup.
- Custom audio picking via `expo-document-picker` + sandbox copy (fixes the persisted-URI bug).
- Looping alarm sound on the alarm audio stream; verify DND/silent behavior.

### Phase 4 — iOS parity + hardening (2 weeks)
- iOS `UNCalendarNotificationTrigger` scheduling (with documented limitations).
- Shake task calibration on `expo-sensors`.
- Permission flows (exact-alarm, notifications, audio).
- Accessibility pass (labels, roles) — missing in the original.

### Phase 5 — Quality (ongoing)
- Unit tests for pure logic (`mathEquation.ts`, `memoryGame.ts`, `time.ts`, next-alarm computation).
- E2E test of the alarm fire → dismiss cycle on a physical Android device.
- Migrations framework for the SQLite schema.

## 7. Known Risks & Open Questions

| Risk | Mitigation |
|---|---|
| **iOS cannot do exact wake-up alarms.** The whole product premise is "alarm you can't ignore." | Design the iOS experience around `UNCalendarNotificationTrigger` + a critical-alert sound + a foreground dismissal task. Accept that iOS alarms are notification-triggered, not alarm-manager-driven. Decide whether to ship iOS with this limitation or Android-only initially. |
| **Custom native module is unavoidable.** | Budget the Phase-2 time generously; treat the alarm scheduler as the project's single most complex component. |
| **exp4j → JS evaluator safety.** | Use a strict regex allow-list (`/^[\d+\-*\s]+$/`) before evaluating; never `eval` arbitrary input. |
| **`TypeConverter` CSV asymmetry** (`"".split(",") === [""]`). | Store `days` as JSON in the port; never as CSV. |
| **Stale-alarm backlog.** The original Kotlin receiver guards with `today == day && hour == currentHour && minute == currentMinute`. | Replicate the same guard in the native module's on-fire handler; drop missed alarms rather than firing them all at once on wake. |
| **Content-URI persistence bug** (doc 06 §2.3). | Copy picked audio to the app sandbox at pick time; store the local `file://` URI in the DB. |
| **Missing boot re-arming.** | Persist enabled alarms in SQLite; on `BOOT_COMPLETED` re-register all of them. |
| **Alarm sound over silent/DND.** | Use the alarm audio category on both platforms; test on real devices with DND on. |
| **Shake sensor units differ** (`expo-sensors` vs Android `SensorManager`). | Recalibrate the 11 m/s² threshold on real devices; document the chosen `expo-sensors` threshold. |
| **`HomeViewModel.updateNextAlarm` is complex day/hour/minute arithmetic.** | Port it as pure functions in `src/utils/time.ts` and unit-test the wrap-around cases before wiring to the UI. |

## 8. Out-of-Scope for the Port (Acceptable Drops)

These are scaffolding artifacts from the original Kotlin/Jetpack Compose app (https://github.com/HoweiAY/brainly-alarm) with no product behavior.

- The `WRITE_EXTERNAL_STORAGE` permission (unused in the original code).
- The `Datasource.alarmData` sample list (test seed data).
- Compose `@Preview` scaffolding.
- The `ExampleUnitTest` / `ExampleInstrumentedTest` placeholders.
