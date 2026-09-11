# React Native + Expo Migration Guide

This document is the actionable plan for re-implementing Brainly Alarm in React Native + Expo. It synthesizes the per-subsystem findings from docs 01–06 into a single recommended architecture, library list, native-module surface, and phased plan.

## 1. Recommended Library Stack

| Concern          | Recommended Library                                                                 | Rationale                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework        | **Expo (managed workflow, dev-client for native)**                                  | Best DX; `expo prebuild` to eject native code when the custom alarm module demands it.                                                                                                                                          |
| Navigation       | **`expo-router`** (file-based routing, the default Expo navigation solution)        | Replaces the nested `MainStack`/`AlarmStack` Compose graph with route groups `(main)`/`(alarm)` and per-group `_layout.tsx` (see doc 04 §7.1). Built on `react-navigation` but config-driven, so no imperative navigator setup. |
| State management | **Zustand** (+ `immer`)                                                             | Lightweight, mirrors the per-screen `ViewModel` + `StateFlow` pattern. One store per screen, one shared alarm store.                                                                                                            |
| Local DB         | **`expo-sqlite`** (SQL) or **WatermelonDB** (reactive ORM)                          | WatermelonDB gives the reactive `observeAllAlarms()` the current `LiveData` provides; `expo-sqlite` is lighter. Pick WatermelonDB if you want the reactivity for free.                                                          |
| Alarm scheduling | **Custom native module** (`expo-modules-core`) for exact, wake-up, recurring alarms | No Expo library gives exact, wake-up, recurring alarms with Alarmy-level guarantees. See §2.                                                                                                                                    |
| Sound playback   | **`expo-audio`** (newer) or `expo-av`                                               | Looping playback; route to alarm audio category.                                                                                                                                                                                |
| Audio picking    | **`expo-document-picker`** + `expo-file-system` copy to sandbox                     | Avoids storage permissions; guarantees long-term playback (fixes the persisted-URI bug in doc 06 §2.3).                                                                                                                         |
| Sensors          | **`expo-sensors` (`Accelerometer`)**                                                | Drop-in for the shake task.                                                                                                                                                                                                     |
| Notifications    | **`expo-notifications`**                                                            | Channel creation, scheduling, dismissal.                                                                                                                                                                                        |
| Date/time        | **`date-fns`** + native `Date`                                                      | Replaces `java.util.Calendar` weekday arithmetic.                                                                                                                                                                               |
| Math evaluation  | Hand-written tokenizer (no external dep)                                            | Controlled, safe, ~50 LOC.                                                                                                                                                                                                      |
| Permissions      | **`expo-notifications`** + `expo-modules-autolinking` for exact-alarm               | See doc 06 §7.                                                                                                                                                                                                                  |
| Build / CI       | EAS Build (`eas build --profile development/production`)                            | Prebuild + native module compilation.                                                                                                                                                                                           |

## 2. Native Module Surface (Required)

The following native capabilities have no Expo/React-Native cross-platform equivalent and **must** be implemented as a custom Expo module (`expo-modules-core`) or a config plugin + bare native code:

### 2.1 `AlarmSchedulerModule`

```ts
interface AlarmScheduler {
  scheduleWeekly(opts: {
    identifier: string;
    weekday: number; // Mon=0 .. Sun=6
    hour: number; // 0..23
    minute: number; // 0..59
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

- `identifier` and `payload` are canonical. Schedule options do not repeat `alarmId` or `soundUri`; Android derives its custom playback URI from `payload.sound` (`"Default"` selects the system alarm tone).
- **Android:** wraps `AlarmManager`, one request per `"$alarmId:$weekday"` identifier (hashed for the `PendingIntent` request code). `AlarmReceiver` applies the stale guard, starts `AlarmSoundService`, launches the deep link, and emits `onAlarmFired`. `AlarmNotificationManager` owns the channel and foreground notification.
- **iOS:** has no exact-alarm API. It uses `UNCalendarNotificationTrigger` / `UNTimeIntervalNotificationTrigger`, accepts the scheduled-notification limit and degraded delivery guarantees, and handles received/responses through Expo listeners.
- **Boot persistence:** `BootReceiver` reads enabled alarms and language from SQLite and re-registers weekly schedules without requiring React Native to load.
- Weekly rescheduling and snooze remain orchestration functions in `src/alarms/scheduling.ts`, not native bridge methods. Alarm dismissal calls `stopAlarmSound()` and clears delivered notifications directly; the bridge does not expose a dismissed event.

### 2.2 Alarm Sound API (folded into `AlarmSchedulerModule`)

- `playAlarmSound` / `stopAlarmSound` expose native looping playback through the shared scheduler bridge.
- Android `AlarmSoundService` owns only foreground-service and `MediaPlayer` lifecycle, routes playback through `AudioAttributes.USAGE_ALARM`, and releases the player on stop.
- iOS uses `AVAudioPlayer` only while the app is active and otherwise relies on notification sound, preserving the documented degraded behavior.

### 2.3 Android Notification Ownership

- `AlarmNotificationManager` is the single owner of channel configuration and foreground-notification construction. Both JS channel synchronization and `AlarmSoundService` delegate to it.
- `AlarmNotificationCopy.kt` stores native English and Traditional Chinese fallback values in a locale-keyed hash map; English is the default for unknown/missing language keys so boot and service paths work without React Native.
- TypeScript keeps pure localized copy in `src/notifications/alarmNotificationCopy.ts` and Expo/runtime integration in `src/notifications/AlarmNotifications.ts`. The latter synchronizes the native channel before permission checks and avoids duplicate permission requests when authorization is already granted or provisional.

### 2.4 Background Playback (Android)

While an alarm is ringing, `AlarmSoundService` runs as a foreground media-playback service so the sound keeps playing if the user backgrounds the app. Its required ongoing notification is produced by `AlarmNotificationManager`.

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
│  ├─ createAlarmStore.ts          # CreateAlarmUiState equivalent
│  └─ settingsStore.ts             # UserSettings (language, colorScheme, snooze, etc.); persisted to the `settings` SQLite table
├─ settings/
│  └─ userSettings.ts              # normalizeUserSettings, isAppColorScheme, snooze clamping (pure, testable)
├─ theme/
│  ├─ colors.ts                    # darkColors (default) + lightColors palettes, shared `Colors` type
│  ├─ index.ts                     # `Theme`, `useTheme()`, `createThemedStyles()` — driven by `settings.colorScheme`
│  ├─ spacing.ts / radii.ts / typography.ts
├─ data/
│  ├─ types.ts                     # Alarm, AlarmSnapshot, UserSettings, AppColorScheme, enums
│  ├─ db.ts                        # expo-sqlite / Drizzle setup + migrations
│  ├─ constants.ts                 # weekdays, taskTypes, taskDifficulties, DEFAULT_USER_SETTINGS
│  └─ userSettings.ts              # persistence (read/write the single `settings` JSON row)
├─ alarms/
│  ├─ AlarmScheduler.ts            # wraps the native module
│  ├─ scheduling.ts               # setAlarm/cancelAlarm/resetAlarm/snooze logic
│  └─ sound.ts                    # AlarmSoundManager equivalent (over the native module)
├─ notifications/
│  ├─ alarmNotificationCopy.ts    # pure localized notification copy
│  └─ AlarmNotifications.ts       # Expo handler, permission, channel-sync, dismissal APIs
├─ tasks/
│  ├─ memoryGame.ts                # game loop helpers (pure, testable)
│  ├─ mathEquation.ts             # generateEquation + evaluateExpression (pure)
│  └─ phoneShaking.ts            # threshold/debounce constants + shake counter
└─ utils/
   ├─ time.ts                     # HH:mm formatting, weekday deltas, next-alarm countdown
   └─ permissions.ts
native/
├─ index.ts                        # shared TypeScript bridge contract
├─ android/                        # scheduler, receivers, notification manager, sound service
└─ ios/                            # degraded notification scheduling and foreground playback
```

## 4. State Management Strategy

- **`alarmStore` (shared):** holds `alarms: Alarm[]` and exposes:
  - `loadAlarms()`, `insertAlarm`, `updateAlarm`, `deleteAlarm`, `getAlarmById`.
  - A subscription so screens re-render on changes (Zustand `subscribeWithSelector` or WatermelonDB `withObservables`). This replaces `LiveData<List<Alarm>>`.
- **`homeStore`:** mirrors `HomeUiState` (doc 04 §6.1): `optionsExpanded`, `alarmEditEnabled`, `selectedAlarms`, `enabledAlarms`, `nextAlarmDay/Hour/Minute`, `nextAlarmMsg`, plus the toggle flags. Actions: `selectOptions`, `dismissDropdown`, `toggleAlarmEnabled`, `enableAllAlarms`, `toggleAlarmSelected`, `selectAllAlarms`, `cancelAlarmsEdit`, `updateNextAlarm`, `updateNextAlarmMsg`.
- **`createAlarmStore`:** mirrors `CreateAlarmUiState` (doc 04 §6.2): `alarmId`, `weekdaysSelected`, `hourSelected`, `minuteSelected`, `taskSelected`, `roundsSelected`, `difficultySelected`, `alarmSoundSelected`, `alarmSoundUri`, `snoozeEnabled`, `taskSelectorExpanded`. Actions: `reset`, `expandTaskSelector`, `updateWeekdays`, `updateTaskSelected`, `updateRoundCount`, `updateTaskDifficulty`, `updateSoundSelected`, `updateSnoozeEnabled`.
- **`settingsStore` (shared):** holds the single `UserSettings` object (`autoDismissEnabled`, `snoozeMinutes`, `showTileNumbers`, `language`, `colorScheme`) and exposes `init()`, `ensureLoaded()`, `updateSettings(patch)`. Persisted as one JSON row in the `settings` SQLite table (`src/data/userSettings.ts`); normalization/validation lives in `src/settings/userSettings.ts`. The `colorScheme` field ("dark"|"light", default "dark") drives `useTheme()`/`createThemedStyles()` (see doc 04 §7 "Theme system") and is applied platform-wide by the root layout (`Appearance.setColorScheme` + `SystemUI.setBackgroundColorAsync`).
- **Time-polling effects:** the per-minute `HomeMenu` countdown and the per-second `AlarmDisplay` clock become `setInterval` loops inside `useEffect`, cleaned up on unmount.

## 5. Data Model (TypeScript)

```ts
export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type TaskType = "Memory" | "Math" | "Shake phone" | "None";
export type Difficulty = "Easy" | "Normal" | "Hard";
export type AppColorScheme = "dark" | "light";

export interface Alarm {
  id: string;
  days: Weekday[]; // [] === every day (resolved at schedule time)
  hour: number; // 0..23
  minute: number; // 0..59
  task: TaskType;
  rounds: number; // 1..5
  difficulty: Difficulty;
  sound: string | null; // null = system default; otherwise sandbox file URI
  snooze: boolean;
  enabled: boolean;
}

// The serialized snapshot carried by the native scheduler / notification payload.
export interface AlarmSnapshot {
  alarmId: string;
  weekday: number; // Mon=0 .. Sun=6
  hour: number;
  minute: number;
  task: TaskType;
  roundCount: number;
  difficulty: Difficulty;
  sound: string; // "Default" or sandbox file URI
  snooze: boolean;
  enabled: boolean;
  isSnoozed: boolean;
  notificationTitle: string;
  notificationBody: string;
}

// User preferences persisted as a single JSON row in the `settings` table.
export interface UserSettings {
  autoDismissEnabled: boolean;
  snoozeMinutes: number; // 1..60, default 5
  showTileNumbers: boolean;
  language: AppLanguage; // "en" | "zh-Hant"
  colorScheme: AppColorScheme; // "dark" (default) | "light"
}
```

- Store `days` as a **JSON array** column (not CSV — fixes the `TypeConverter` edge cases in doc 06 §4).
- Use the exact same `taskTypes` / `taskDifficulties` ordering so the index-based logic in `AlarmDisplay` (e.g. `task == taskTypes[3]` for "None", `taskTypes[2]` for "Shake phone") carries over — or, preferably, replace index checks with explicit enum comparisons in the port for readability.

## 6. Phased Migration Plan

### Phase 0 — Foundations (1 week)

- `npx create-expo-app@latest --template tabs` (TypeScript) or `npx create-expo-app` then `npx expo install expo-router` (dev-client build).
- Set up the **Expo Router** skeleton: `app/_layout.tsx`, `app/(main)/`, `app/(alarm)/` groups with empty route files matching doc 04 §7.1. Configure the `(alarm)` group as `fullScreenModal`.
- Set up Zustand stores (empty) and `expo-sqlite`/WatermelonDB schema for the `alarms` table.
- Implement `alarmStore` CRUD backed by the DB (the store is the single source of truth; screens subscribe via selectors).

### Phase 1 — Static UI parity (1–2 weeks)

- Implement `app/(main)/index.tsx` (Home), `app/(main)/create-alarm/index.tsx` + `[alarmId].tsx`, `AlarmCard`, `WeekdayTextButton` as pure UI wired to the stores, no alarms yet. Navigation via `router.push` / `router.back`.
- Implement `app/(alarm)/index.tsx` (AlarmDisplay: clock + buttons, no real trigger).
- Implement the three task route screens (`app/(alarm)/tasks/...`) with their game loops (pure TS in `src/tasks/`).
- Visual/UX parity with the Compose app.

### Phase 2 — Persistence + scheduling (2–3 weeks)

- Build the `AlarmScheduler` native module (Android first).
- Wire `setAlarm`/`cancelAlarm`/`resetAlarm`/`snooze` in `src/alarms/scheduling.ts`.
- Implement the background playback task + `AlarmSoundManager` equivalent.
- End-to-end Android alarm fire → `AlarmDisplay` → task → dismiss → weekly reschedule.
- Add boot re-arming.

### Phase 3 — Sound + notifications (1 week)

- Native Android channel/foreground-notification ownership via `AlarmNotificationManager`; Expo permission and iOS notification listener setup.
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

| Risk                                                                                                                                                                                                                                                                       | Mitigation                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **iOS cannot do exact wake-up alarms.** The whole product premise is "alarm you can't ignore."                                                                                                                                                                             | Design the iOS experience around `UNCalendarNotificationTrigger` + a critical-alert sound + a foreground dismissal task. Accept that iOS alarms are notification-triggered, not exact-alarm-driven. Decide whether to ship iOS with this limitation or Android-only initially.              |
| **Custom native module is unavoidable.**                                                                                                                                                                                                                                   | Budget the Phase-2 time generously; treat the alarm scheduler as the project's single most complex component.                                                                                                                                                                               |
| **exp4j → JS evaluator safety.**                                                                                                                                                                                                                                           | Use a strict regex allow-list (`/^[\d+\-*\s]+$/`) before evaluating; never `eval` arbitrary input.                                                                                                                                                                                          |
| **`TypeConverter` CSV asymmetry** (`"".split(",") === [""]`).                                                                                                                                                                                                              | Store `days` as JSON in the port; never as CSV.                                                                                                                                                                                                                                             |
| **Stale-alarm backlog.** The original Kotlin receiver guards with `today == day && hour == currentHour && minute == currentMinute`.                                                                                                                                        | Replicate the same guard in the native module's on-fire handler; drop missed alarms rather than firing them all at once on wake.                                                                                                                                                            |
| **Content-URI persistence bug** (doc 06 §2.3).                                                                                                                                                                                                                             | Copy picked audio to the app sandbox at pick time; store the local `file://` URI in the DB.                                                                                                                                                                                                 |
| **Missing boot re-arming.**                                                                                                                                                                                                                                                | Persist enabled alarms in SQLite; on device reboot re-register all of them.                                                                                                                                                                                                                 |
| **Alarm sound over silent/DND.**                                                                                                                                                                                                                                           | Use the alarm audio category on both platforms; test on real devices with DND on.                                                                                                                                                                                                           |
| **Shake sensor units differ** (`expo-sensors` vs Android `SensorManager`).                                                                                                                                                                                                 | Recalibrate the 11 m/s² threshold on real devices; document the chosen `expo-sensors` threshold.                                                                                                                                                                                            |
| **`HomeViewModel.updateNextAlarm` is complex day/hour/minute arithmetic.**                                                                                                                                                                                                 | Port it as pure functions in `src/utils/time.ts` and unit-test the wrap-around cases before wiring to the UI.                                                                                                                                                                               |
| **`gradlew clean` breaks CMake on the new architecture.** `clean` deletes autolinked library codegen dirs (e.g. `@react-native-vector-icons/lucide`) before the app's `externalNativeBuildClean*` tasks re-run CMake configuration, which then fails on the missing paths. | Ship the `plugins/withCxxCleanFix.js` config plugin (registered in `app.json`); it patches the generated `android/app/build.gradle` to delete the `.cxx` cache before any `externalNativeBuildClean*` task runs, making the CMake clean a no-op. See README §Android build troubleshooting. |

## 8. Out-of-Scope for the Port (Acceptable Drops)

These are scaffolding artifacts from the original Kotlin/Jetpack Compose app (https://github.com/HoweiAY/brainly-alarm) with no product behavior.

- The `WRITE_EXTERNAL_STORAGE` permission (unused in the original code).
- The `Datasource.alarmData` sample list (test seed data).
- Compose `@Preview` scaffolding.
- The `ExampleUnitTest` / `ExampleInstrumentedTest` placeholders.
