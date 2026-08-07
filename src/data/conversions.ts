import {
  difficultyToIndex,
  indexToDifficulty,
  indexToWeekday,
  storageToTaskType,
  taskTypeToStorage,
  weekdayToIndex,
} from "./constants";
import {
  DEFAULT_ALARM_NOTIFICATION_BODY,
  DEFAULT_ALARM_NOTIFICATION_TITLE,
} from "@/notifications/AlarmNotifications";
import type { alarmsTable } from "./schema";
import type { Alarm, AlarmSnapshot } from "./types";

type AlarmRow = typeof alarmsTable.$inferSelect;
type AlarmInsert = typeof alarmsTable.$inferInsert;

export function rowToAlarm(row: AlarmRow): Alarm {
  return {
    id: row.id,
    days: row.days.map((i) => indexToWeekday[i] ?? "Mon"),
    hour: row.hour,
    minute: row.minute,
    task: storageToTaskType[row.task] ?? "Memory",
    rounds: row.rounds,
    difficulty: indexToDifficulty[row.difficulty] ?? "Easy",
    sound: row.sound,
    snooze: row.isSnooze,
    enabled: row.isEnabled,
  };
}

export function draftToInsert(
  draft: Omit<Alarm, "id">,
  id: string,
  now: number,
): AlarmInsert {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    days: draft.days.map((d) => weekdayToIndex[d]),
    hour: draft.hour,
    minute: draft.minute,
    task: taskTypeToStorage[draft.task],
    rounds: draft.rounds,
    difficulty: difficultyToIndex[draft.difficulty],
    sound: draft.sound,
    isSnooze: draft.snooze,
    isEnabled: draft.enabled,
  };
}

export function alarmToUpdateSet(
  alarm: Alarm,
  now: number,
): Omit<AlarmInsert, "id" | "createdAt"> {
  return {
    updatedAt: now,
    days: alarm.days.map((d) => weekdayToIndex[d]),
    hour: alarm.hour,
    minute: alarm.minute,
    task: taskTypeToStorage[alarm.task],
    rounds: alarm.rounds,
    difficulty: difficultyToIndex[alarm.difficulty],
    sound: alarm.sound,
    isSnooze: alarm.snooze,
    isEnabled: alarm.enabled,
  };
}

export function alarmToSnapshot(
  alarm: Alarm,
  weekday: number,
  isSnoozed = false,
): AlarmSnapshot {
  return {
    alarmId: alarm.id,
    weekday,
    hour: alarm.hour,
    minute: alarm.minute,
    task: alarm.task,
    roundCount: alarm.rounds,
    difficulty: alarm.difficulty,
    sound: alarm.sound ?? "Default",
    snooze: alarm.snooze,
    enabled: alarm.enabled,
    isSnoozed,
    notificationTitle: DEFAULT_ALARM_NOTIFICATION_TITLE,
    notificationBody: DEFAULT_ALARM_NOTIFICATION_BODY,
  };
}
