# Brainly Alarm — Project Overview

## 1. Summary

Brainly Alarm is a task-based alarm clock application for Android, inspired by the commercial app [Alarmy](https://alar.my/). It was originally developed as a course project at the Hong Kong University of Science and Technology.

Unlike a conventional alarm that can be silenced with a single tap, Brainly Alarm forces the user to complete a short cognitive or physical task before the alarm sound stops. The goal is to ensure the user is genuinely awake before the alarm is dismissed.

The original implementation is a native Android app written in Kotlin using Jetpack Compose, available at **https://github.com/HoweiAY/brainly-alarm**. That source is no longer vendored in this repository. This document, together with the feature-specific documents in `/docs`, serves as the specification for a planned re-implementation in React Native + Expo.

## 2. Core Features

### 2.1 Alarm Management
- Create, edit, delete, and enable/disable multiple alarms.
- Each alarm is defined by:
  - A time (hour and minute, 12-hour picker).
  - A set of weekdays (one or more of Mon–Sun). When no day is selected, the alarm is scheduled for every day of the week.
  - A dismissal task type (Memory, Math, Shake phone, or None).
  - A task difficulty (Easy / Normal / Hard) — applies to Memory and Math tasks.
  - A number of task rounds (1–5) — applies to Memory and Math tasks.
  - An alarm sound: the system default alarm tone, or a user-selected audio file from local storage.
  - A snooze toggle (on by default). When enabled, snoozing delays the alarm by 5 minutes.
- The Home screen shows a live "Next alarm in X days Y hours Z minutes" countdown, an alarm list, and a bulk "Turn all on/off" / "Edit" (multi-select delete) menu.

### 2.2 Alarm Triggering
- Alarms are scheduled with the Android `AlarmManager` using exact, wake-up alarms (`setExactAndAllowWhileIdle`, `RTC_WAKEUP`).
- Each (alarm id, day-of-week) pair is scheduled as its own `PendingIntent` so that a multi-day alarm fires independently on each configured weekday.
- When an alarm fires, `AlarmReceiver` (a `BroadcastReceiver`):
  - Validates that the current day/hour/minute match the scheduled time (or that the alarm is a snooze).
  - Posts a high-priority notification ("Time to wake up!") that launches the app.
  - Starts playing the alarm sound (looping) via `AlarmSoundManager`.
  - Starts `MainActivity` with an `alarmTriggered=true` extra so the app opens directly into the alarm dismissal flow.
- The receiver is registered in the manifest to also respond to `BOOT_COMPLETED`, although re-scheduling of alarms after reboot is not currently persisted.

### 2.3 Dismissal Tasks
To turn off a triggered alarm, the user completes one of the following tasks (selected per alarm):

| Task | Description | Difficulty effect | Rounds effect |
|---|---|---|---|
| **Memory Game** | A grid of tiles flashes in a random order; the user must tap the tiles in the same order. | Easy/Normal → 3×3 grid, 4–5 tiles. Hard → 4×4 grid, 6 tiles. | Number of consecutive successful rounds required. |
| **Math Equation** | The user solves a randomly generated arithmetic expression and types the integer answer. | Easy → 2 operands (1–30, +/-). Normal → 3 operands (1–50, +/-). Hard → 3 operands (1–20, +/-/*). | Number of equations to solve consecutively. |
| **Phone Shaking** | The user shakes the device a random number of times (15–30). Uses the accelerometer. | Not applicable (disabled). | Not applicable (disabled). |
| **None** | No task — the alarm is dismissed immediately by tapping "Turn off". | Not applicable. | Not applicable. |

Completing the final round stops the alarm sound and navigates back to the Home screen via `AlarmViewModel.onAlarmDismissed()`.

### 2.4 Snooze
- If snooze is enabled for the alarm, the dismissal screen offers a "Snooze for 5 minutes" button.
- Snoozing cancels the current alarm, schedules a new one-shot alarm 5 minutes in the future, stops the sound, and returns the user to the Home screen.

### 2.5 Alarm Reschedule (Weekly Reset)
- When a non-None alarm is dismissed via "Begin task", the existing `PendingIntent` for the current weekday is cancelled and re-scheduled for the same weekday one week later (the app adds 7 days to the alarm time, controlled by the `reset` flag in `AlarmViewModel.setAlarm`).
- This effectively makes each weekday slot a recurring weekly alarm.

## 3. Technologies (Original Implementation)

These describe the upstream Kotlin/Jetpack Compose app at **https://github.com/HoweiAY/brainly-alarm**, not this repository.

| Area | Technology |
|---|---|
| Language | Kotlin |
| UI Toolkit | Jetpack Compose + Material 3 |
| Navigation | Jetpack Navigation Compose |
| Local Database | Room (SQLite), version 2, single `alarms` table |
| State Management | `ViewModel` + `StateFlow` / `LiveData`, observed via `collectAsState` / `observeAsState` |
| Alarm Scheduling | Android `AlarmManager` + `BroadcastReceiver` |
| Sound Playback | Android `Ringtone` / `RingtoneManager` (singleton `AlarmSoundManager`) |
| Notifications | `NotificationManager` + `NotificationCompat`, channel `brainly_alarm_id` |
| Sensors | `SensorManager` accelerometer for the shake task |
| Math evaluation | `exp4j` library (`net.objecthunter:exp4j:0.4.8`) |
| Media picking | `ActivityResultContracts.GetContent` (`audio/*`) + `MediaStore` for filename lookup |
| Build | Gradle (Kotlin DSL), AGP 8.1.2, Kotlin 1.9.10, KSP, minSdk 28 / targetSdk 34 |

## 4. Project Structure

The tree below is the layout of the **original** Kotlin/Jetpack Compose app at **https://github.com/HoweiAY/brainly-alarm**. It is **not** present in this repository; it is reproduced here so the per-file references in docs 02–06 resolve. Paths are relative to that upstream repository's root.

```
app/src/main/java/com/example/alarmapp/
├── MainActivity.kt                  # Entry activity; sets up notification channel + ViewModel
├── BrainlyAlarmScreen.kt            # NavHost: defines all screens and routes
├── model/data/
│   ├── Alarm.kt                     # Room entity + time/days helpers
│   ├── AlarmDao.kt                  # Room DAO (insert/update/delete/get)
│   ├── AlarmDatabase.kt            # Room database singleton
│   ├── AlarmRepository.kt          # Coroutine wrapper over the DAO
│   ├── AlarmDatabaseViewModel.kt  # App-wide CRUD ViewModel
│   └── Datasource.kt               # Static constants (weekdays, task types, difficulties)
├── components/
│   ├── alarm/
│   │   ├── AlarmReceiver.kt        # BroadcastReceiver fired by AlarmManager
│   │   ├── AlarmViewModel.kt       # setAlarm / cancelAlarm / onAlarmDismissed
│   │   └── AlarmDisplay.kt        # Triggered-alarm dismissal screen
│   ├── menus/
│   │   ├── HomeMenu.kt             # Home screen
│   │   ├── CreateAlarmMenu.kt      # Create/Edit alarm screen
│   │   └── viewModels/
│   │       ├── HomeViewModel.kt
│   │       ├── HomeUiState.kt
│   │       ├── CreateAlarmViewModel.kt
│   │       └── CreateAlarmUiState.kt
│   └── tasks/
│       ├── MemoryGame.kt
│       ├── MathEquation.kt
│       └── PhoneShaking.kt
├── ui/
│   ├── AlarmCard.kt                # List item for each alarm
│   └── theme/                      # Color / Type / Theme
└── utils/
    ├── AlarmSoundManager.kt        # Singleton Ringtone player
    └── TypeConverter.kt            # Room List<String> <-> CSV string
```

## 5. Permissions

Declared in `AndroidManifest.xml`:
- `POST_NOTIFICATIONS` — alarm foreground notification.
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` — selecting custom alarm audio.
- `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` — exact, wake-up alarm scheduling.

## 6. Target Audience & UX Notes

- Portrait-only single-screen app.
- Minimal onboarding — no authentication, no accounts, no cloud sync. All data is local.
- Visually simple: cards for alarms, a Material 3 `TimePicker`, sliders/radio buttons/switches for configuration.
- Designed so that the dismissal task is the "hero" interaction of the app.

## 7. Notes for the Expo Re-implementation

The port is **Expo-first**. The intended stack and subsystem mappings:

- **Navigation:** Jetpack Compose's `NavHost` + nested `navigation(...)` graphs map onto **Expo Router** (file-based routing). The `MainScreen` / `AlarmScreen` graph roots become route groups `app/(main)/` and `app/(alarm)/`, each with a `_layout.tsx`. See `docs/04-navigation-and-ui-architecture.md` §7.
- **Alarm scheduling:** heavily platform-specific (`AlarmManager`, `PendingIntent`, `BroadcastReceiver`). No Expo library gives exact, wake-up, recurring alarms with Alarmy-level guarantees, so the port will need a **custom Expo native module** (Android `AlarmManager`; iOS `UNCalendarNotificationTrigger` with documented limitations), complemented by `expo-notifications` + `expo-task-manager`.
- **Persistence:** Room/SQLite maps onto `expo-sqlite` (or WatermelonDB for the reactive `LiveData`-style observation).
- **State:** Jetpack Compose `ViewModel` + `StateFlow` patterns map onto React hooks + **Zustand** stores.
- **Sensors:** the accelerometer shake task maps onto `expo-sensors` (`Accelerometer`).
- **Audio:** custom alarm sound selection maps onto `expo-document-picker` (with sandbox copy); looping alarm playback maps onto `expo-audio`.

A full actionable plan, library list, and project layout live in `docs/07-react-native-migration-guide.md`.
