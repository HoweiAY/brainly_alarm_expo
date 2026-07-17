# Brainly Alarm — Documentation

This folder contains the specification documents for the Brainly Alarm app, prepared to guide an **Expo-first** re-implementation (React Native via **Expo Router**).

## Contents

| # | Document | Scope |
|---|---|---|
| 01 | [Project Overview](01-project-overview.md) | High-level summary, core features, technology stack, project structure, and the cross-cutting notes for the RN port. |
| 02 | [Data Layer & Persistence API](02-data-layer-and-persistence.md) | The `Alarm` data model, Room database, DAO, repository, and app-wide database ViewModel. Includes a TypeScript sketch of the equivalent repository API. |
| 03 | [Alarm Scheduling & Triggering System](03-alarm-scheduling-system.md) | `AlarmManager` scheduling, `AlarmReceiver` firing, cancellation, snooze, weekly reschedule, notification channel, and the RN native-module mapping. |
| 04 | [Navigation, Screens & UI Architecture](04-navigation-and-ui-architecture.md) | The NavHost graph, route catalog, per-screen specifications, and the `HomeViewModel` / `CreateAlarmViewModel` state contracts. Maps each Compose concept to an **Expo Router** / Zustand equivalent. |
| 05 | [Dismissal Tasks Specification](05-dismissal-tasks.md) | Full spec of the Memory Game, Math Equation, Phone Shaking, and "None" tasks, including state machines, difficulty tables, and edge cases. |
| 06 | [Sound, Notifications & Platform Utilities](06-sound-notifications-and-platform-utils.md) | `AlarmSoundManager`, custom audio selection, notification channel/notifications, Room `TypeConverter`, exp4j, sensors, and the permissions map for the RN port. |
| 07 | [React Native / Expo Migration Guide](07-react-native-migration-guide.md) | Recommended **Expo Router** project structure, library choices, native-module surface, state-management strategy, phased migration plan, and known risks. |

## How to Use These Docs

1. Start with **01** for product context and feature inventory.
2. Read **02** and **04** together to understand the data and UI surface that must be reproduced.
3. Read **03** and **06** to understand the platform-specific subsystems that require native modules in RN.
4. Read **05** to implement the dismissal tasks.
5. Use **07** as the actionable migration plan.

## Original Codebase

The original Kotlin/Jetpack Compose source is **not** vendored in this repository. It lives in the upstream project at **https://github.com/HoweiAY/brainly-alarm** (under `app/src/main/java/com/example/alarmapp/`). All file references in these documents are paths relative to the root of that upstream repository; browse them there if you need to cross-check the original implementation. The inline Kotlin snippets in these docs are reproduced from that source for specification purposes.
