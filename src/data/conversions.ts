import {
  difficultyToIndex,
  indexToDifficulty,
  indexToWeekday,
  storageToTaskType,
  taskTypeToStorage,
  weekdayToIndex,
} from "./constants";
import type { alarmsTable } from "./schema";
import type { Alarm } from "./types";

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
