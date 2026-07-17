# Navigation, Screens & UI Architecture

This document specifies the app's navigation graph, screens, the ViewModels that back them, and the UI state patterns. It is the primary reference for reproducing the screens and navigation in the **Expo** re-implementation using **Expo Router** (file-based routing).

> The original Kotlin source referenced by the `Source:` lines below lives in the upstream repository at **https://github.com/HoweiAY/brainly-alarm** (under `app/src/main/java/com/example/alarmapp/`); it is not vendored in this repo.

## 1. Top-Level Architecture

The app is a single-activity Jetpack Compose application. `MainActivity` hosts a `BrainlyAlarmApp` composable, which in turn hosts a single `NavHost` from Jetpack Navigation Compose.

```
MainActivity
  └─ BrainlyAlarmApp(alarmIntent, context, stopAlarmSound, alarmDatabaseViewModel)
       └─ NavHost(startDestination = alarmTriggered ? AlarmScreen : MainScreen)
            ├─ navigation "MainScreen"  (start = Home)
            │    ├─ Home
            │    └─ CreateAlarm?alarmId={alarmId?}
            └─ navigation "AlarmScreen" (start = DisplayAlarm)
                 ├─ DisplayAlarm
                 ├─ MemoryGame/{rounds}/{difficulty}
                 ├─ MathEquation/{rounds}/{difficulty}
                 └─ PhoneShaking
```

The `startDestination` is chosen at composition time from the `alarmTriggered` boolean in the launching `Intent`. When the app is launched normally, the user lands on `Home`; when an alarm fires, they land on `DisplayAlarm`.

## 2. Route Catalog

Source: `BrainlyAlarmScreen.kt`, `strings.xml`.

### 2.1 `AppScreen` enum (top-level graph roots)

| Name          | Route         | Title (string resource)         |
| ------------- | ------------- | ------------------------------- |
| `MainScreen`  | `MainScreen`  | `main_screen` — "Main screen"   |
| `AlarmScreen` | `AlarmScreen` | `alarm_screen` — "Alarm screen" |

### 2.2 `AlarmScreen` enum (sub-destinations, used in both graph roots)

| Name           | Route                           | Title                                    |
| -------------- | ------------------------------- | ---------------------------------------- |
| `Home`         | `Home`                          | `home_menu` — "Home menu"                |
| `CreateAlarm`  | `CreateAlarm?alarmId={alarmId}` | `create_alarm_menu` — "Create an alarm"  |
| `DisplayAlarm` | `DisplayAlarm`                  | `display_alarm_screen` — "Alarm display" |

`alarmId` is an optional `StringType` nav arg (nullable). When omitted → "create new alarm"; when present → "edit existing alarm".

### 2.3 `TasksScreen` enum (dismissal tasks)

| Name           | Route                                | Title                           |
| -------------- | ------------------------------------ | ------------------------------- |
| `MemoryGame`   | `MemoryGame/{rounds}/{difficulty}`   | `memory_game` — "Memory"        |
| `MathEquation` | `MathEquation/{rounds}/{difficulty}` | `math_equation` — "Math"        |
| `PhoneShaking` | `PhoneShaking`                       | `phone_shaking` — "Shake phone" |

`rounds` (Int) and `difficulty` (String) are path params with defaults `1` and `taskDifficulties[0]` ("Easy") if absent.

## 3. Transitions

- `MainScreen` ↔ `AlarmScreen` graph roots: no enter/exit transitions (`EnterTransition.None` / `ExitTransition.None`).
- `CreateAlarm` route: `slideInHorizontally(300ms) + fadeIn(300ms, LinearEasing)` enter; symmetric `slideOutHorizontally + fadeOut` exit.
- All other routes use NavHost defaults.

## 4. Shared Dependencies Injected into Screens

Every screen composable receives (directly or via `viewModel()`):

- `alarmDatabaseViewModel: AlarmDatabaseViewModel` — shared CRUD + lookup state.
- `navController: NavHostController` — for navigation actions.
- `context: Context` — application context (for `AlarmViewModel`, sensor access, content resolver).
- `stopAlarmSound: () -> Unit` — provided by `MainActivity`, calls `AlarmSoundManager.stopAlarmSound()`.

The `AlarmViewModel` (scheduling) is **not** shared — each screen constructs its own `AlarmViewModel(LocalContext.current)` as needed.

## 5. Screen Specifications

### 5.1 `HomeMenu` — `components/menus/HomeMenu.kt`

**ViewModel:** `HomeViewModel` (`viewModel()` scoped) + `AlarmDatabaseViewModel` (shared).

**Backing state:** `HomeUiState` (see §6.1).

**Layout (top-to-bottom):**

1. Greeting header: "Welcome to Brainly Alarm!".
2. "Next alarm in X day(s) Y hour(s) Z minute(s)" countdown (refreshed every minute via a `LaunchedEffect` loop).
3. "Alarms" row with:
   - **+ (Add)** icon button → navigates to `CreateAlarm` (no `alarmId`).
   - **⋮ (More options)** icon button → dropdown menu:
     - "Turn all on/off" — toggles every alarm in the DB; updates each row, calls `setAlarm`/`cancelAlarm` accordingly, recomputes next-alarm message.
     - "Edit" — enters multi-select edit mode.
4. `LazyColumn` of `AlarmCard`s (one per `Alarm`).
5. In edit mode: a bottom action bar with "Cancel" and "Select all", and a 🗑 delete icon that removes all selected alarms.

**Reactive effects:**

- On `alarmData` change (from `observeAsState`): syncs each alarm's `enabled` state with the OS schedule, then recomputes the next-alarm message.
- Per-minute tick: calls `homeViewModel.updateNextAlarm(enabledAlarms)`.
- On `alarmMsgChanged` / `enableAlarmChanged` flags: refreshes the displayed `nextAlarmMsg`.

### 5.2 `AlarmCard` — `ui/AlarmCard.kt`

A Material 3 `Card` representing one alarm.

- Left: `alarm.getTimeString()` (30sp) + `alarm.getDaysString()` (12sp).
- Right (non-edit mode): a `Switch` bound to `alarm.enabled`. Toggling persists via `updateAlarm`, then `setAlarm` or `cancelAlarm`, and recomputes the next-alarm message.
- Right (edit mode): a `Checkbox` bound to selection.
- `combinedClickable`:
  - `onClick`: in edit mode → toggles selection; otherwise → navigates to `CreateAlarm?alarmId=${alarm.id}` (edit flow).
  - `onLongClick`: toggles selection and enters edit mode.

### 5.3 `CreateAlarmMenu` — `components/menus/CreateAlarmMenu.kt`

**ViewModel:** `CreateAlarmViewModel` (`viewModel()` scoped) + `AlarmDatabaseViewModel`.

**Backing state:** `CreateAlarmUiState` (see §6.2).

**Loading behavior:** When `alarmId != null`, loads the alarm via `getAlarmById`, verifies the returned `Alarm.id` matches, then calls `resetUiState(alarm)` to seed the UI. Until loaded (`alarmLoaded == false`), the form is not rendered.

**Form fields:**

1. **TimePicker** (Material 3, 12-hour) — initial values from loaded alarm or UI state defaults (hour 8, minute 0).
2. **Day** — `LazyRow` of `WeekdayTextButton`s for each entry in `weekdays`. Toggle selection in `CreateAlarmViewModel.updateWeekdays`. (Confirm treats an empty selection as "all 7 days".)
3. **Task** — dropdown of `taskTypes`. `ArrowDropDown` icon toggles `taskSelectorExpanded`.
4. **No. of Rounds** — `Slider` 1–5 with 3 steps. **Disabled** when task is `Shake phone` or `None`.
5. **Difficulty** — 3 `RadioButton`s for `taskDifficulties`. **Disabled** when task is `Shake phone` or `None`.
6. **Sound** — label + "Select" `TextButton` launching `ActivityResultContracts.GetContent("audio/*")`. The chosen file's display name is resolved via `MediaStore` and shown; the URI string is stored.
7. **Snooze** — `Switch` bound to `snoozeEnabled`.

**Footer actions:**

- **Cancel** — resets UI state and `navController.popBackStack()`.
- **Confirm**:
  - If editing an existing alarm: `cancelAlarm(old)`, mutate the loaded `Alarm` fields in place, `updateAlarm`, `setAlarm`.
  - If creating: build a new `Alarm` (default `enabled = true`), `insertAlarm`, `setAlarm`.
  - Always: `resetUiState(null)` and `popBackStack()`.

### 5.4 `AlarmDisplay` — `components/alarm/AlarmDisplay.kt`

**ViewModels:** `AlarmViewModel` (scheduling) + `AlarmDatabaseViewModel` (lookup + reschedule persist).

**Behavior:**

- Reads the alarm snapshot from `alarmIntent` extras (with safe defaults).
- Loads the corresponding `Alarm` from DB via `getAlarmById` for the reschedule path.
- Shows a centered column: "Time to wake up!" label + large live-updating `HH:mm` clock (updates the displayed minute every second via a `LaunchedEffect` loop).
- Two buttons:
  - **"Begin task"** (or **"Turn off"** when `task == "None"`):
    1. `resetAlarm(...)` — cancels the current weekday's PI and re-arms it for next week (if `enabled`).
    2. `updateAlarm(alarm)` in DB.
    3. If `task == None`: `stopAlarmSound()` + `onAlarmDismissed(context)`.
       Else navigate to the matching task route (`MemoryGame/{rounds}/{difficulty}`, `MathEquation/{rounds}/{difficulty}`, or `PhoneShaking`).
  - **"Snooze for 5 minutes"** (only rendered when `snooze == true`):
    1. `stopAlarmSound()`.
    2. `cancelAlarm(updatedAlarm(...), isSnoozed=true)`.
    3. `updateAlarm(alarm)`.
    4. `setAlarm(updatedAlarm(...), reset=false, snoozed=true)` (fires in 5 min).
    5. `Toast("Alarm snoozed for 5 minutes")`.
    6. `onAlarmDismissed(context)`.

### 5.5 Dismissal Tasks

See `docs/05-dismissal-tasks.md` for the full task specifications. From a navigation standpoint, each task is a leaf route under the `AlarmScreen` graph. On completion they all call `stopAlarmSound()` + `AlarmViewModel.onAlarmDismissed(context)` and do **not** navigate back through the stack — they launch a fresh `MainActivity` intent that re-enters at `Home`.

## 6. ViewModels & UI State

### 6.1 `HomeViewModel` + `HomeUiState`

`HomeUiState` (`components/menus/viewModels/HomeUiState.kt`):

| Field                      | Type                 | Default           | Purpose                                                                       |
| -------------------------- | -------------------- | ----------------- | ----------------------------------------------------------------------------- |
| `optionsExpanded`          | `Boolean`            | `false`           | More-options dropdown open?                                                   |
| `alarmEditEnabled`         | `Boolean`            | `false`           | Multi-select edit mode active?                                                |
| `enableAlarmChanged`       | `Boolean`            | `false`           | Toggle flag (flipped each change) used as a `LaunchedEffect` key.             |
| `alarmMsgChanged`          | `Boolean`            | `false`           | Toggle flag for next-alarm message changes.                                   |
| `selectedAlarms`           | `MutableList<Alarm>` | `[]`              | Alarms selected in edit mode.                                                 |
| `enabledAlarms`            | `MutableList<Alarm>` | `[]`              | Mirror of currently-enabled alarms, used to compute the next-alarm countdown. |
| `nextAlarmDay/Hour/Minute` | `Int`                | `0`               | Components of the countdown.                                                  |
| `nextAlarmMsg`             | `String`             | `"No alarms set"` | Rendered countdown text.                                                      |

`HomeViewModel` exposes (`StateFlow<HomeUiState>`):

| Method                                             | Effect                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `resetUiState()`                                   | Clears dropdown/edit/selection, recomputes next-alarm.                                         |
| `selectOptions()` / `dismissDropdown(editEnabled)` | Open/close options dropdown.                                                                   |
| `enableEdit()`                                     | Enter edit mode (delegates to `dismissDropdown(editEnabled=true)`).                            |
| `toggleAlarmEnabled(alarm, enable)`                | Adds/removes from `enabledAlarms`, flips `enableAlarmChanged`, recomputes next-alarm.          |
| `enableAllAlarms(alarmData): Boolean`              | Toggles all alarms on/off; returns resulting "all enabled" state.                              |
| `toggleAlarmSelected(alarm)`                       | Toggles membership in `selectedAlarms`.                                                        |
| `selectAllAlarms(alarmData)`                       | Selects all or clears selection.                                                               |
| `clearSelectedAlarm()`                             | Empties selection.                                                                             |
| `cancelAlarmsEdit()`                               | Exits edit mode.                                                                               |
| `updateNextAlarm(alarmData)`                       | Computes the soonest upcoming alarm from all enabled alarms and stores day/hour/minute deltas. |
| `updateNextAlarmMsg(alarmData)`                    | Builds the "Next alarm in …" string from the deltas.                                           |
| `nextAlarmCalendar(current, calendars)` (private)  | Picks the calendar entry with the smallest (day, hour, minute) delta from now.                 |

**Next-alarm computation** (in `updateNextAlarm` + `nextAlarmCalendar`): for each enabled alarm, for each of its weekdays, builds a `Calendar` at that weekday + hour + minute and computes the (dayDiff, hourDiff, minuteDiff) from now, accounting for wrap-around (a passed time today is treated as next week). The minimum-delta calendar wins. This is purely a display computation — it does **not** affect actual scheduling.

### 6.2 `CreateAlarmViewModel` + `CreateAlarmUiState`

`CreateAlarmUiState` (`components/menus/viewModels/CreateAlarmUiState.kt`):

| Field                             | Type                  | Default     | Purpose                                          |
| --------------------------------- | --------------------- | ----------- | ------------------------------------------------ |
| `alarmId`                         | `Int?`                | `null`      | Id of the alarm being edited; `null` for create. |
| `weekdaysSelected`                | `MutableList<String>` | `[]`        | Selected weekdays.                               |
| `hourSelected` / `minuteSelected` | `Int`                 | `8` / `0`   | TimePicker seed values.                          |
| `taskSelected`                    | `String`              | `"Memory"`  | `taskTypes[0]`.                                  |
| `roundsSelected`                  | `Int`                 | `1`         | 1–5.                                             |
| `difficultySelected`              | `String`              | `"Easy"`    | `taskDifficulties[0]`.                           |
| `alarmSoundSelected`              | `String`              | `"Default"` | Display name of chosen audio.                    |
| `alarmSoundUri`                   | `String`              | `"Default"` | Content-URI string.                              |
| `snoozeEnabled`                   | `Boolean`             | `true`      | Snooze toggle.                                   |
| `taskSelectorExpanded`            | `Boolean`             | `false`     | Task dropdown open?                              |

`CreateAlarmViewModel` exposes (`StateFlow<CreateAlarmUiState>`):

| Method                                                      | Effect                                                                                                                            |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `resetUiState(alarm)`                                       | If `alarm != null`, seeds all fields from it; else resets to defaults.                                                            |
| `expandTaskSelector(expand)`                                | Open/close the task dropdown.                                                                                                     |
| `updateWeekdays(weekday)`                                   | Toggle a weekday in `weekdaysSelected`.                                                                                           |
| `updateHourSelected(hour)` / `updateMinuteSelected(minute)` | Update time fields.                                                                                                               |
| `updateTaskSelected(task)`                                  | Set `taskSelected`.                                                                                                               |
| `updateRoundCount(rounds)`                                  | Set `roundsSelected`.                                                                                                             |
| `updateTaskDifficulty(difficulty)`                          | Set `difficultySelected`.                                                                                                         |
| `updateSoundSelected(context, uri): String`                 | Queries `MediaStore` for the display name of `uri`, sets both `alarmSoundSelected` and `alarmSoundUri`, returns the display name. |
| `updateSnoozeEnabled(enabled)`                              | Set `snoozeEnabled`.                                                                                                              |

> **Note:** the Material 3 `TimePicker` keeps its own state (`rememberTimePickerState`); the `hourSelected`/`minuteSelected` UI-state fields are only seeds. On Confirm, the time is read directly from `timePickerState.hour`/`minute`.

## 7. React Native + Expo Mapping (Expo Router)

> The port is **Expo-first** and uses **Expo Router** (file-based routing on top of `react-navigation`), the recommended navigation solution for Expo apps. Screens are files under an `app/` directory; nested `NavHost` graphs map to **route groups** (parenthesised folders) each with a `_layout.tsx` defining its `Stack`.

| Compose concept                                                      | Expo Router equivalent                                                                                                                                                                         |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NavHost` + nested `navigation(...)` graph roots                     | Route **groups**: `app/(main)/` and `app/(alarm)/`, each with a `_layout.tsx` (`<Stack>`). The root `app/_layout.tsx` renders the active group. The parenthesised name is not part of the URL. |
| `composable(route)`                                                  | A route file, e.g. `app/(main)/index.tsx` ↔ `Home`, `app/(alarm)/index.tsx` ↔ `AlarmDisplay`.                                                                                                  |
| `navigation("CreateAlarm?alarmId={id}")` with nullable `alarmId`     | `router.push('/create-alarm', { alarmId })` for edit, or `router.push('/create-alarm')` for create. `useLocalSearchParams<{ alarmId?: string }>()` reads it.                                   |
| `navigation("MemoryGame/{rounds}/{difficulty}")` path params         | **Dynamic route** file `app/(alarm)/tasks/memory-game/[rounds]/[difficulty].tsx`; read via `useLocalSearchParams<{ rounds: string; difficulty: string }>()`.                                   |
| `navController.popBackStack()`                                       | `router.back()` (or `router.replace('/(main)')` to clear the alarm stack on dismiss).                                                                                                          |
| `startDestination = if (alarmTriggered) AlarmScreen else MainScreen` | In root `_layout.tsx`, on mount (or on the alarm deep-link event) call `router.replace('/(alarm)')` when triggered, else `router.replace('/(main)')`.                                          |
| `viewModel()` scoped state                                           | Per-screen hook (Zustand store slice, `useState`/`useReducer`, or a `useScreenViewModel` hook).                                                                                                |
| `StateFlow<UiState>` + `collectAsState`                              | Zustand `useStore(selector)` (preferred) / Context + `useMemo`.                                                                                                                                |
| `LiveData` + `observeAsState`                                        | Subscription-based store (see data-layer doc).                                                                                                                                                 |
| `LaunchedEffect(Unit) { while(true) { ...; delay(1000) } }`          | `useEffect` + `setInterval`, cleaned up on unmount.                                                                                                                                            |
| `ActivityResultContracts.GetContent("audio/*")`                      | `expo-document-picker` + `expo-audio`.                                                                                                                                                         |
| `TimePicker` (Material 3)                                            | `@react-native-community/datetimepicker` (mode="time") or a custom wheel picker.                                                                                                               |
| `Switch` / `Slider` / `RadioButton` / `Checkbox`                     | `react-native` `Switch`, `@react-native-community/slider`, custom radio/checkbox.                                                                                                              |
| `LazyColumn`                                                         | `FlashList` (preferred) / `FlatList`.                                                                                                                                                          |

### 7.1 Suggested Expo Router File Tree

```
app/
├─ _layout.tsx                        # root <Stack screenOptions={{ headerShown:false }}>; routes into the active group
├─ (main)/                            # route group (name not in URL) — mirrors "MainScreen" NavHost graph
│  ├─ _layout.tsx                     # <Stack> for the main flow (slide/fade transitions)
│  ├─ index.tsx                       # Home
│  └─ create-alarm/
│     ├─ index.tsx                    # CreateAlarm — new alarm (no alarmId)
│     └─ [alarmId].tsx                # CreateAlarm — edit existing (dynamic route)
└─ (alarm)/                           # route group — mirrors "AlarmScreen" NavHost graph (presented modally)
   ├─ _layout.tsx                     # <Stack presentation="fullScreenModal"> for the alarm flow
   ├─ index.tsx                       # AlarmDisplay  (params: { alarmSnapshot })
   └─ tasks/
      ├─ memory-game/
      │  └─ [rounds]/[difficulty].tsx # nested dynamic segments
      ├─ math-equation/
      │  └─ [rounds]/[difficulty].tsx
      └─ phone-shaking.tsx
```

**How the alarm-flow launch works (replacing the `startDestination` switch):**

- Normal launch → root `_layout.tsx` redirects to `/(main)` (Home) via `router.replace('/(main)')` in a `useEffect`.
- Alarm fire (notification tap / deep-link `/alarm` or a native-module event) → `router.replace('/(alarm)', { alarmSnapshot })`, opening `AlarmDisplay` modally over Home.
- The `(alarm)` group's `_layout.tsx` uses `presentation: 'fullScreenModal'` so the dismissal flow overlays the entire app, matching the current Compose NavHost behaviour where `AlarmScreen` is the `startDestination` and tasks are leaves under it.
- Task completion calls `stopAlarmSound()` + the native dismiss callback, then `router.replace('/(main)')` (not `router.back()`) to discard the alarm stack entirely — mirroring `AlarmViewModel.onAlarmDismissed()` which starts a fresh `MainActivity` with `FLAG_ACTIVITY_CLEAR_TOP`.

**Create-alarm optional-id pattern:** split into `create-alarm/index.tsx` (create) and `create-alarm/[alarmId].tsx` (edit). `AlarmCard`'s `onClick` navigates with `router.push('/create-alarm/' + alarm.id)`; the `+` button uses `router.push('/create-alarm')`.
