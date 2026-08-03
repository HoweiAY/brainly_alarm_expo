import {
  difficultyToIndex,
  indexToDifficulty,
  indexToWeekday,
  storageToTaskType,
  taskTypeToStorage,
  weekdayToIndex,
} from "./constants";
import type { alarmsTable, scheduledAlarmsTable } from "./schema";
import type {
  Alarm,
  AlarmSnapshot,
  ScheduledAlarmRecord,
  ScheduledAlarmType,
} from "./types";

type AlarmRow = typeof alarmsTable.$inferSelect;
type AlarmInsert = typeof alarmsTable.$inferInsert;
type ScheduledAlarmRow = typeof scheduledAlarmsTable.$inferSelect;
type ScheduledAlarmInsert = typeof scheduledAlarmsTable.$inferInsert;

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
  };
}

export function scheduledRowToRecord(
  row: ScheduledAlarmRow,
): ScheduledAlarmRecord {
  return {
    id: row.id,
    alarmId: row.alarmId,
    weekday: row.weekday,
    type: row.type as ScheduledAlarmType,
    triggerAt: row.triggerAt,
    payload: row.payload,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function recordToInsert(
  record: Omit<ScheduledAlarmRecord, "createdAt" | "updatedAt">,
  now: number,
): ScheduledAlarmInsert {
  return {
    id: record.id,
    alarmId: record.alarmId,
    weekday: record.weekday,
    type: record.type,
    triggerAt: record.triggerAt,
    payload: record.payload,
    createdAt: now,
    updatedAt: now,
  };
}

export function recordToUpdateSet(
  record: Omit<ScheduledAlarmRecord, "createdAt" | "updatedAt">,
  now: number,
): Omit<ScheduledAlarmInsert, "id" | "createdAt" | "alarmId"> {
  return {
    weekday: record.weekday,
    type: record.type,
    triggerAt: record.triggerAt,
    payload: record.payload,
    updatedAt: now,
  };
}
