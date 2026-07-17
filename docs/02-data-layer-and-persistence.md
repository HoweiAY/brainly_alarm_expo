# Data Layer & Persistence API

This document describes the persistence layer of Brainly Alarm: the data model, the Room database, the DAO, the repository, and the app-wide database ViewModel. This is the equivalent of an "API layer" for local data access and is the primary contract the React Native re-implementation must reproduce.

> The original Kotlin source referenced by the `Source:` lines below lives in the upstream repository at **https://github.com/HoweiAY/brainly-alarm** (under `app/src/main/java/com/example/alarmapp/`); it is not vendored in this repo.

## 1. Data Model — `Alarm`

Source: `model/data/Alarm.kt`

The entire app's persisted state is a single entity: `Alarm`. There are no other tables.

| Field        | Type           | Column                  | Default     | Notes                                                                                                                                  |
| ------------ | -------------- | ----------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | `Int`          | `id` (PK, autoGenerate) | `0`         | Auto-incremented primary key.                                                                                                          |
| `days`       | `List<String>` | `days`                  | `[]`        | Weekday abbreviations, e.g. `["Mon","Wed","Fri"]`. Stored as CSV via `TypeConverter`. Empty list means "every day" at scheduling time. |
| `hour`       | `Int`          | `hour`                  | `12`        | 24-hour format 0–23 internally; UI uses a 12-hour `TimePicker`.                                                                        |
| `minute`     | `Int`          | `minute`                | `0`         | 0–59.                                                                                                                                  |
| `task`       | `String`       | `task`                  | `"Memory"`  | One of `taskTypes`: `Memory`, `Math`, `Shake phone`, `None`.                                                                           |
| `rounds`     | `Int`          | `task rounds`           | `1`         | 1–5. Only used for Memory/Math.                                                                                                        |
| `difficulty` | `String`       | `difficulty`            | `"Easy"`    | One of `taskDifficulties`: `Easy`, `Normal`, `Hard`.                                                                                   |
| `sound`      | `String`       | `sound`                 | `"Default"` | Either the literal `"Default"` (use system alarm ringtone) or a content-`Uri` string picked from local storage.                        |
| `snooze`     | `Boolean`      | `snooze`                | `true`      | Whether the snooze button is shown on the dismissal screen.                                                                            |
| `enabled`    | `Boolean`      | `enabled`               | `true`      | Whether the alarm is currently scheduled. Toggled from the Home screen.                                                                |

### 1.1 Helper Methods on `Alarm`

| Method                             | Returns                                | Purpose                                                                                                                                                                                                         |
| ---------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getTimeInMillis(): Long`          | `Long`                                 | Computes the next `Calendar` time-in-ms for the alarm by scanning its `days` and picking the earliest upcoming slot. (Used for display/ordering; the authoritative scheduling logic lives in `AlarmViewModel`.) |
| `getTimeString(): String`          | `"HH:mm"`                              | Zero-padded 24-hour time for the alarm card.                                                                                                                                                                    |
| `getDaysString(): String`          | `"Mon, Wed, Fri"` / `"Every day"`      | Human-readable days label. If all 7 weekdays are present → `"Every day"`.                                                                                                                                       |
| `getCalendarDay(day: String): Int` | `Calendar.SUNDAY`..`Calendar.SATURDAY` | Converts a weekday abbreviation to a `Calendar` day-of-week constant. Throws `IllegalArgumentException` on unknown input.                                                                                       |

### 1.2 Static Constants — `Datasource.kt`

```kotlin
val weekdays       = listOf("Mon","Tue","Wed","Thu","Fri","Sat","Sun")
val taskTypes      = listOf("Memory","Math","Shake phone","None")
val taskDifficulties = listOf("Easy","Normal","Hard")
```

> **RN port note:** Replace these with a TypeScript enum/const object. The string `"Shake phone"` (with a space) is used as the task identifier; the `"None"` sentinel is the 4th element of `taskTypes`.

## 2. Type Conversion — `TypeConverter`

Source: `utils/TypeConverter.kt`

Room cannot store `List<String>` natively, so a `@TypeConverter` serializes it:

- `listToString(list)  = list.joinToString(",")` → `"Mon,Wed,Fri"`
- `stringToList(string) = string.split(",")` → `["Mon","Wed","Fri"]`

> **RN port note:** With `expo-sqlite` or any JSON-capable store, store `days` as a JSON array column directly. The CSV approach is an artifact of Room.

## 3. Database — `AlarmDatabase`

Source: `model/data/AlarmDatabase.kt`

```kotlin
@Database(entities = [Alarm::class], version = 2, exportSchema = false)
abstract class AlarmDatabase : RoomDatabase {
    abstract fun alarmDao(): AlarmDao
    companion object {
        fun getAlarmDatabase(context: Context): AlarmDatabase  // double-checked-locked singleton
    }
}
```

- Database name: `"alarm_database"`.
- Migration strategy: `fallbackToDestructiveMigration()` — on schema change the database is wiped. No migration logic exists. **Any RN port should design a real migration strategy from day one.**
- Single DAO, single table.

## 4. DAO — `AlarmDao`

Source: `model/data/AlarmDao.kt`

| Method             | SQL                                           | Thread    | Returns                                                                  |
| ------------------ | --------------------------------------------- | --------- | ------------------------------------------------------------------------ |
| `insert(alarm)`    | `INSERT ... ON CONFLICT IGNORE`               | `suspend` | Unit. Ignores if the PK collides (auto-generated, so effectively never). |
| `update(alarm)`    | `UPDATE ... ON CONFLICT REPLACE`              | `suspend` | Unit. Used for both edits and toggling `enabled`.                        |
| `delete(alarm)`    | `DELETE` by entity match                      | `suspend` | Unit.                                                                    |
| `getAllAlarms()`   | `SELECT * FROM alarms ORDER BY id ASC`        | reactive  | `LiveData<List<Alarm>>`. Observed by Home screen.                        |
| `getAlarmById(id)` | `SELECT * FROM alarms WHERE id = :id LIMIT 1` | blocking  | `Alarm` (single fetch).                                                  |

### 4.1 Equivalent API Surface (TypeScript sketch)

```ts
type Alarm = {
  id: number; // auto-increment PK
  days: string[]; // ["Mon","Wed","Fri"] or [] for daily
  hour: number; // 0..23
  minute: number; // 0..59
  task: "Memory" | "Math" | "Shake phone" | "None";
  rounds: number; // 1..5
  difficulty: "Easy" | "Normal" | "Hard";
  sound: string; // "Default" or content-uri string
  snooze: boolean;
  enabled: boolean;
};

interface AlarmRepository {
  insertAlarm(alarm: Omit<Alarm, "id">): Promise<number>;
  updateAlarm(alarm: Alarm): Promise<void>;
  deleteAlarm(alarm: Alarm): Promise<void>;
  getAllAlarms(): Promise<Alarm[]>;
  getAlarmById(id: number): Promise<Alarm | null>;
  observeAllAlarms(callback: (alarms: Alarm[]) => void): () => void; // unsub
}
```

## 5. Repository — `AlarmRepository`

Source: `model/data/AlarmRepository.kt`

A thin coroutine wrapper over the DAO. It owns a `CoroutineScope(Dispatchers.Main)` and dispatches each call onto `Dispatchers.IO`.

- `insertAlarm`, `updateAlarm`, `deleteAlarm`, `getAllAlarms` → fire-and-forget `launch(IO)`.
- `getAlarmById(id)` → `async(IO).await()`, returns `Alarm?`.
- `allAlarms: LiveData<List<Alarm>>` exposed directly from the DAO for reactive observation.

> **RN port note:** No equivalent of `LiveData` exists; use a reactive store (Zustand selector, WatermelonDB `withObservables`, or an RxJS/EventEmitter observable) so the Home list re-renders on any change.

## 6. App-wide Database ViewModel — `AlarmDatabaseViewModel`

Source: `model/data/AlarmDatabaseViewModel.kt`

Constructed once per `MainActivity` via `AlarmDatabaseViewModelFactory` and shared across screens through the NavHost.

| API                                | Description                                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `allAlarms: LiveData<List<Alarm>>` | Reactive list of all alarms; observed by `HomeMenu`.                                                                   |
| `foundAlarm: LiveData<Alarm?>`     | Single-alarm lookup result; observed by `CreateAlarmMenu` and `AlarmDisplay` to load an alarm for editing / dismissal. |
| `insertAlarm(alarm)`               | Delegates to repository.                                                                                               |
| `updateAlarm(alarm)`               | Delegates to repository. Used for edits, enable/disable, and post-dismissal rescheduling.                              |
| `deleteAlarm(alarm)`               | Delegates to repository.                                                                                               |
| `getAllAlarms(): List<Alarm>`      | Synchronous snapshot of `allAlarms.value`.                                                                             |
| `getAlarmById(id)`                 | Launches a `viewModelScope` coroutine, fetches via repository, and pushes the result into `foundAlarm`.                |

### 6.1 Lookup Flow (used by edit + dismissal screens)

```
Caller: alarmDatabaseViewModel.getAlarmById(id)
   └─> viewModelScope.launch { alarmRepository.getAlarmById(id) }   // async(IO)
         └─> _foundAlarm.value = result
               └─> Compose observes foundAlarm via observeAsState()
                     └─> UI re-renders when foundAlarm changes
```

Because `foundAlarm` is a single shared `MutableLiveData`, the caller must verify the returned alarm's `id` matches the requested one before using it (see the `alarmLoaded` guard in `CreateAlarmMenu.kt`).

## 7. Lifecycle & Instantiation

- `MainActivity.onCreate` creates the notification channel and obtains the `AlarmSoundManager` singleton.
- A single `AlarmDatabaseViewModel` is created via `viewModel(...)` keyed by `"AlarmDataBaseViewModel"` and passed down the entire NavHost to `HomeMenu`, `CreateAlarmMenu`, and `AlarmDisplay`.
- `MainActivity.onResume` cancels notification id `1` (the alarm notification).
- `MainActivity.onDestroy` stops any playing alarm sound.

## 8. Migration Notes for RN/Expo

1. Use `expo-sqlite` (with a typed repository) or WatermelonDB. Either way, define a proper migration runner instead of destructive fallback.
2. Store `days` as JSON, not CSV, to avoid comma-in-token edge cases and to simplify queries.
3. Replace `LiveData` reactivity with a store subscription model and expose an `observeAllAlarms` API.
4. Centralize all CRUD in a single repository module so UI components never touch SQL directly — mirroring the existing `AlarmRepository` boundary.
5. Generate the auto-increment `id` from the database (SQLite `INTEGER PRIMARY KEY AUTOINCREMENT`) so it matches the current behavior used by `AlarmManager` request codes.
