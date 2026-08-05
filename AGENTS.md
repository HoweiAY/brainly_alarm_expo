# Brainly Alarm — Expo Re-implementation

## Project

Brainly Alarm is an Alarmy-style task-based alarm clock. The user must complete a cognitive/physical task (Memory game, Math equation, Phone shake, or None) before an alarm stops sounding. Originally a Kotlin/Jetpack Compose Android app; this repo is the **Expo-first** re-implementation (React Native via **Expo Router**, SDK ~57, RN 0.86, React 19).

Read the exact versioned Expo docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Spec Docs

Authoritative specifications live in `docs/`:

- `01-project-overview.md` — product, features, original Kotlin structure, Expo stack mapping.
- `02-data-layer-and-persistence.md` — `Alarm` entity, DAO/store API, TypeScript sketch, migration notes.
- `03-alarm-scheduling-system.md` — `AlarmManager` scheduling, firing, cancel/snooze, weekly reschedule, native-module API.
- `04-navigation-and-ui-architecture.md` — NavHost graph, route catalog, per-screen specs, ViewModel/UiState contracts, Expo Router file tree.
- `05-dismissal-tasks.md` — Memory/Math/Shake/None state machines, difficulty tables, edge cases.
- `06-sound-notifications-and-platform-utils.md` — `AlarmSoundManager`, custom audio picker, notification channel, TypeConverter, exp4j, sensors, permissions.
- `07-react-native-migration-guide.md` — library stack, native-module surface, project structure, data model (TS), phased plan, risks.

Always read the relevant `docs/` section before implementing a subsystem; the docs are the source of truth, not the original Kotlin code.

## Tech Stack (target)

- **Framework:** Expo managed workflow + dev-client (custom native module required).
- **Navigation:** `expo-router` (file-based). Route groups `app/(main)/` and `app/(alarm)/`, each with `_layout.tsx`.
- **State:** Zustand (+ immer). One shared `alarmStore`, plus per-screen `homeStore` / `createAlarmStore` mirroring the Kotlin `ViewModel`/`StateFlow` contracts.
- **Persistence:** `expo-sqlite` via Drizzle ORM (`drizzle-orm/expo-sqlite`); drizzle-kit migrations in `drizzle/` — after editing `src/data/schema.ts` run `npm run db:generate` and include the generated artifacts when committing the schema change is requested. Store `days` as **JSON** (Drizzle `json` column mode), never CSV. `babel.config.js` exists only for `babel-plugin-inline-import` (`.sql` inlining for Drizzle migrations) and `metro.config.js` adds `sql` to `sourceExts`; do not re-add decorator plugins.
- **Migration squashing:** Run `npm run db:squash` (`scripts/squash-migrations.js`) to collapse all incremental Drizzle migrations into a single `0000_init.sql`. The script concatenates every `drizzle/*.sql`, keeps the latest snapshot renamed to `0000_snapshot.json`, resets `_journal.json` to one entry, and re-writes `migrations.js`. Run this periodically when the migration count grows; subsequent `db:generate` runs diff against the squashed snapshot and produce incremental migrations normally.
- **Native module build:** Run `npm run build:native` (`scripts/build-native-module.js`) to compile the custom `alarm-scheduler` Expo module at `native/`. Accepts an optional platform argument (`android`, `ios`, or `all` — default `all`). The script first runs `expo prebuild --platform <p> --no-install` if the native project directories (`android/`, `ios/`) don't exist. For **Android**, it invokes `./gradlew :expo.modules.alarmscheduler:assembleRelease` in the generated `android/` directory, compiling only the alarm-scheduler library (not the full app). For **iOS**, it runs `pod install` in the generated `ios/` directory to build the CocoaPods-based module. Run this after making changes to any file under `native/android/` (Kotlin sources, `build.gradle`, `AndroidManifest.xml`) or `native/ios/` (Swift sources, `AlarmScheduler.podspec`) to verify the module compiles before a full `expo run:android`/`expo run:ios`. The `native/` module is auto-linked via `expo.autolinking.nativeModulesDir: "./native"` in `package.json` and its config plugin (`native/app.plugin.js`) is registered in `app.json`.
- **Alarm scheduling:** custom Expo native module for exact, wake-up, recurring alarms (iOS has no exact alarms — degraded UX is expected and must be documented). Complement with `expo-notifications` + `expo-task-manager`.
- **Sound:** `expo-audio` (or `expo-av`) looping on the alarm audio category; override silent/DND where the platform allows. Keep playback alive in the background while ringing.
- **Audio picking:** `expo-document-picker` + `expo-file-system` copy to sandbox (fixes the persisted-URI bug from doc 06 §2.3).
- **Sensors:** `expo-sensors` `Accelerometer` for the shake task (recalibrate the 11 m/s² threshold).
- **Date/time:** `date-fns` + native `Date`.
- **Math evaluation:** hand-written tokenizer or sanitized `Function("return " + expr)` with `/^[\d+\-*\s]+$/` allow-list. Never `eval` arbitrary input.

## Data Model

`Alarm` is the single persisted entity. See `docs/02` §1 and `docs/07` §5 for the full TypeScript interface. Key fields: `id` (auto-increment), `days: Weekday[]` (`[]` ⇒ every day at schedule time), `hour/minute` (24-hour internally), `task: "Memory"|"Math"|"Shake phone"|"None"`, `rounds` 1–5, `difficulty: "Easy"|"Normal"|"Hard"`, `sound` (`"Default"` or sandbox `file://` URI), `snooze`, `enabled`. Weekday/task/difficulty constants live in `src/data/constants.ts`.

## Implementation Guidelines for LLMs

1. **Read the docs first.** Before touching a subsystem, read the matching `docs/0X-*.md` section and `docs/07` (migration guide). Note that the original Kotlin source is **not** vendored in this repo; it lives at **https://github.com/HoweiAY/brainly-alarm** (under `app/src/main/java/com/example/alarmapp/`) and is reference-only. Cross-check against that upstream repository when needed.
2. **Follow the planned structure.** Use the Expo Router file tree in `docs/04` §7.1 and the `src/` layout in `docs/07` §3. Non-route code goes in `src/`, not `app/`.
3. **Mirror the contracts, not the code.** Reproduce the data API, UiState fields, scheduling invariants, and dismissal-task state machines exactly. Port ViewModel/StateFlow to Zustand stores; port `LiveData` to subscription-based reactivity.
4. **Centralize CRUD.** All data access goes through a shared Zustand `alarmStore` (optionally backed by a persistence layer); UI components never touch SQL or storage directly.
5. **Native module is required for scheduling.** No Expo library gives exact wake-up recurring alarms. Build `AlarmSchedulerModule` per `docs/03` §10.1 and `docs/07` §2.1; reuse the `"${alarmId}${weekday}".hashCode()` scheduling-identifier scheme. Replicate the stale-alarm guard (`today == day && hour == currentHour && minute == currentMinute || isSnoozed`).
6. **Fix known bugs in the port:**
   - Store `days` as JSON (not CSV) — `docs/06` §4.
   - Copy picked audio to the sandbox; store `file://` URI — `docs/06` §2.3.
   - Implement boot re-arming (persist enabled alarms; re-register on device reboot) — `docs/03` §9.
   - Design a real SQLite migration runner; do not use destructive fallback — `docs/02` §8.
   - Fix the shake-task off-by-one (decrement-then-check) or document it — `docs/05` §3.3.
7. **Dismissal tasks are pure and testable.** Put game-loop/equation/shake logic in `src/tasks/` as pure functions; screens just render state. Keep difficulty→grid-size/operand-count tables identical to `docs/05`.
8. **Shared completion handler.** Implement one `useAlarmDismissal()` hook wrapping `stopAlarmSound()` + the native dismiss callback; every task calls it.
9. **Alarm flow is modal.** The `(alarm)` group uses `presentation: 'fullScreenModal'`. Task completion calls `router.replace('/(main)')` (not `router.back()`) to discard the alarm stack, mirroring `onAlarmDismissed`'s `FLAG_ACTIVITY_CLEAR_TOP`.
10. **Permissions:** request exact-alarm (`SCHEDULE_EXACT_ALARM`, Android 12+), `POST_NOTIFICATIONS`, and audio-picker access at runtime. See `docs/06` §7.
11. **Don't add comments** unless asked. Match existing code style.
12. **Verify before declaring done.** Run `npm run lint` and typecheck (`npx tsc --noEmit`) after non-trivial changes. Prefer unit tests for pure logic (`mathEquation`, `memoryGame`, `time`/next-alarm computation).
13. **Don't commit** unless explicitly asked.

## Out of Scope

`WRITE_EXTERNAL_STORAGE`, `Datasource.alarmData` sample seed, Compose `@Preview` scaffolding, and the `ExampleUnitTest`/`ExampleInstrumentedTest` placeholders — all scaffolding artifacts with no product behavior (`docs/07` §8).
