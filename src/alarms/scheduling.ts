import { alarmToSnapshot } from "@/data/conversions";
import { useAlarmStore } from "@/store/alarmStore";
import { useScheduledAlarmsStore } from "@/store/scheduledAlarmsStore";
import type {
  Alarm,
  AlarmSnapshot,
  Difficulty,
  ScheduledAlarmType,
  TaskType,
} from "@/data/types";
import { getAlarmScheduler } from "./AlarmScheduler";
import { soundUriFromSnapshot } from "./sound";
import {
  expandWeekdays,
  identifierFor,
  nextWeeklyTriggerTime,
  snoozeIdentifierFor,
} from "./weeklyTrigger";

export {
  expandWeekdays,
  identifierFor,
  nextWeeklyTriggerTime,
  snoozeIdentifierFor,
};

const SNOOZE_MINUTES = 5;

interface RegistryEntry {
  id: string;
  alarmId: string;
  weekday: number | null;
  type: ScheduledAlarmType;
  triggerAt: number;
  payload: AlarmSnapshot;
}

export async function setAlarm(alarm: Alarm): Promise<void> {
  const native = getAlarmScheduler();
  await native.forceDismissFiring();
  await native.cancelAllForAlarm(alarm.id);
  await useScheduledAlarmsStore.getState().removeForAlarm(alarm.id);

  if (!alarm.enabled) return;

  const weekdays = expandWeekdays(alarm);
  const store = useScheduledAlarmsStore.getState();
  for (const weekday of weekdays) {
    const identifier = identifierFor(alarm.id, weekday);
    const triggerAt = nextWeeklyTriggerTime(
      weekday,
      alarm.hour,
      alarm.minute,
      Date.now(),
    );
    const payload = alarmToSnapshot(alarm, weekday, false);
    await native.scheduleWeekly({
      identifier,
      alarmId: alarm.id,
      weekday,
      hour: alarm.hour,
      minute: alarm.minute,
      soundUri: alarm.sound,
      payload,
    });
    await store.upsert({
      id: identifier,
      alarmId: alarm.id,
      weekday,
      type: "weekly",
      triggerAt,
      payload,
    });
  }
}

export async function cancelAlarm(alarm: { id: string }): Promise<void> {
  const native = getAlarmScheduler();
  await native.cancelAllForAlarm(alarm.id);
  await useScheduledAlarmsStore.getState().removeForAlarm(alarm.id);
}

export async function rescheduleWeekly(alarm: Alarm): Promise<void> {
  await cancelAlarm(alarm);
  await setAlarm(alarm);
}

export async function resetAlarm(snapshot: AlarmSnapshot): Promise<void> {
  const native = getAlarmScheduler();
  const identifier = identifierFor(snapshot.alarmId, snapshot.weekday);
  await native.cancel(identifier);
  await useScheduledAlarmsStore.getState().remove(identifier);
  if (snapshot.enabled) {
    const triggerAt = nextWeeklyTriggerTime(
      snapshot.weekday,
      snapshot.hour,
      snapshot.minute,
      Date.now(),
      true,
    );
    const payload: AlarmSnapshot = { ...snapshot, isSnoozed: false };
    await native.scheduleOneShot({
      identifier,
      alarmId: snapshot.alarmId,
      triggerAt,
      soundUri: soundUriFromSnapshot(snapshot),
      payload,
    });
    await useScheduledAlarmsStore.getState().upsert({
      id: identifier,
      alarmId: snapshot.alarmId,
      weekday: snapshot.weekday,
      type: "weekly",
      triggerAt,
      payload,
    });
  }
}

export async function snoozeAlarm(snapshot: AlarmSnapshot): Promise<void> {
  const native = getAlarmScheduler();
  await native.stopAlarmSound();
  const identifier = snoozeIdentifierFor(snapshot.alarmId);
  await native.cancel(identifier);
  const triggerAt = Date.now() + SNOOZE_MINUTES * 60_000;
  const payload: AlarmSnapshot = { ...snapshot, isSnoozed: true };
  await native.scheduleOneShot({
    identifier,
    alarmId: snapshot.alarmId,
    triggerAt,
    soundUri: soundUriFromSnapshot(snapshot),
    payload,
  });
  await useScheduledAlarmsStore.getState().upsert({
    id: identifier,
    alarmId: snapshot.alarmId,
    weekday: null,
    type: "snooze",
    triggerAt,
    payload,
  });
}

export async function reconcileSchedules(): Promise<void> {
  try {
    const alarms = useAlarmStore.getState().alarms;
    const registry = useScheduledAlarmsStore.getState();
    const native = getAlarmScheduler();

    const expected = new Map<string, RegistryEntry>();
    let weeklySlotCount = 0;
    for (const alarm of alarms) {
      if (!alarm.enabled) {
        await native.cancelAllForAlarm(alarm.id);
        await registry.removeForAlarm(alarm.id);
        continue;
      }
      const weekdays = expandWeekdays(alarm);
      weeklySlotCount += weekdays.length;
      for (const weekday of weekdays) {
        const id = identifierFor(alarm.id, weekday);
        const triggerAt = nextWeeklyTriggerTime(
          weekday,
          alarm.hour,
          alarm.minute,
          Date.now(),
        );
        const payload = alarmToSnapshot(alarm, weekday, false);
        expected.set(id, {
          id,
          alarmId: alarm.id,
          weekday,
          type: "weekly",
          triggerAt,
          payload,
        });
      }
    }

    const IOS_NOTIFICATION_CAP = 64;
    if (weeklySlotCount > IOS_NOTIFICATION_CAP * 0.75) {
      console.warn(
        `reconcileSchedules: ${weeklySlotCount} weekly slots scheduled, approaching the iOS 64-notification cap`,
      );
    }

    for (const record of registry.getAll()) {
      if (!expected.has(record.id)) {
        await native.cancel(record.id);
        await registry.remove(record.id);
      }
    }

    for (const entry of expected.values()) {
      const existing = registry.getById(entry.id);
      const needsReschedule =
        !existing ||
        existing.triggerAt !== entry.triggerAt ||
        existing.payload.hour !== entry.payload.hour ||
        existing.payload.minute !== entry.payload.minute ||
        existing.payload.enabled !== entry.payload.enabled;
      if (!needsReschedule) continue;
      const alarm = alarms.find((a) => a.id === entry.alarmId);
      if (!alarm) continue;
      await native.scheduleWeekly({
        identifier: entry.id,
        alarmId: entry.alarmId,
        weekday: entry.weekday ?? 0,
        hour: alarm.hour,
        minute: alarm.minute,
        soundUri: alarm.sound,
        payload: entry.payload,
      });
      await registry.upsert(entry);
    }
  } catch (e) {
    console.warn("reconcileSchedules failed", e);
  }
}

const TASK_TYPES: TaskType[] = ["Memory", "Math", "Shake phone", "None"];
const DIFFICULTIES: Difficulty[] = ["Easy", "Normal", "Hard"];

function toBool(value: unknown): boolean {
  return value === true || value === "true";
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function parseAlarmSnapshot(
  params: Record<string, string | string[] | undefined>,
): AlarmSnapshot | null {
  const get = (key: string): string | undefined => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const alarmId = get("alarmId");
  if (!alarmId) return null;
  const taskRaw = get("task");
  const task =
    taskRaw && (TASK_TYPES as string[]).includes(taskRaw)
      ? (taskRaw as TaskType)
      : "Memory";
  const difficultyRaw = get("difficulty");
  const difficulty =
    difficultyRaw && (DIFFICULTIES as string[]).includes(difficultyRaw)
      ? (difficultyRaw as Difficulty)
      : "Easy";
  return {
    alarmId,
    weekday: toNumber(get("weekday")),
    hour: toNumber(get("hour")),
    minute: toNumber(get("minute")),
    task,
    roundCount: toNumber(get("roundCount")),
    difficulty,
    sound: get("sound") ?? "Default",
    snooze: toBool(get("snooze")),
    enabled: toBool(get("enabled")),
    isSnoozed: toBool(get("isSnoozed")),
  };
}

export function snapshotToQueryParams(
  snapshot: AlarmSnapshot,
): Record<string, string> {
  return {
    alarmId: snapshot.alarmId,
    weekday: String(snapshot.weekday),
    hour: String(snapshot.hour),
    minute: String(snapshot.minute),
    task: snapshot.task,
    roundCount: String(snapshot.roundCount),
    difficulty: snapshot.difficulty,
    sound: snapshot.sound,
    snooze: String(snapshot.snooze),
    enabled: String(snapshot.enabled),
    isSnoozed: String(snapshot.isSnoozed),
  };
}
