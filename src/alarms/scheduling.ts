import dayjs from "dayjs";
import { alarmToSnapshot } from "@/data/conversions";
import { useAlarmStore } from "@/store/alarmStore";
import { useAlarmRegistrationsStore } from "@/store/alarmRegistrationsStore";
import { useAlarmFiringStore } from "@/store/alarmFiringStore";
import type { Alarm, AlarmSnapshot, Difficulty, TaskType } from "@/data/types";
import { getAlarmScheduler } from "./AlarmScheduler";
import {
  DEFAULT_ALARM_NOTIFICATION_BODY,
  DEFAULT_ALARM_NOTIFICATION_TITLE,
} from "@/notifications/AlarmNotifications";
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

export async function setAlarm(alarm: Alarm): Promise<void> {
  const native = getAlarmScheduler();
  const registry = useAlarmRegistrationsStore.getState();
  if (useAlarmFiringStore.getState().activeSnapshot?.alarmId === alarm.id) {
    await native.forceDismissFiring();
  }
  await native.cancelAllForAlarm(alarm.id);

  if (!alarm.enabled) {
    await native.cancel(snoozeIdentifierFor(alarm.id));
    await registry.remove(alarm.id, "snooze");
    await registry.remove(alarm.id, "weekly");
    return;
  }

  const weekdays = expandWeekdays(alarm);
  for (const weekday of weekdays) {
    const identifier = identifierFor(alarm.id, weekday);
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
  }
  await registry.upsert(alarm.id, "weekly");
}

export async function cancelAlarm(alarm: { id: string }): Promise<void> {
  const native = getAlarmScheduler();
  await native.cancelAllForAlarm(alarm.id);
  await useAlarmRegistrationsStore.getState().removeForAlarm(alarm.id);
}

export async function rescheduleWeekly(alarm: Alarm): Promise<void> {
  await cancelAlarm(alarm);
  await setAlarm(alarm);
}

export async function resetAlarm(snapshot: AlarmSnapshot): Promise<void> {
  const native = getAlarmScheduler();
  const registry = useAlarmRegistrationsStore.getState();
  const identifier = identifierFor(snapshot.alarmId, snapshot.weekday);
  await native.cancel(identifier);

  if (snapshot.isSnoozed) {
    await registry.remove(snapshot.alarmId, "snooze");
  }

  if (snapshot.enabled) {
    const triggerAt = nextWeeklyTriggerTime(
      snapshot.weekday,
      snapshot.hour,
      snapshot.minute,
      dayjs().valueOf(),
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
  }
}

export async function snoozeAlarm(snapshot: AlarmSnapshot): Promise<void> {
  const native = getAlarmScheduler();
  const registry = useAlarmRegistrationsStore.getState();
  await native.stopAlarmSound();
  const identifier = snoozeIdentifierFor(snapshot.alarmId);
  await native.cancel(identifier);
  const triggerAt = dayjs().add(SNOOZE_MINUTES, "minute").valueOf();
  const payload: AlarmSnapshot = { ...snapshot, isSnoozed: true };
  await native.scheduleOneShot({
    identifier,
    alarmId: snapshot.alarmId,
    triggerAt,
    soundUri: soundUriFromSnapshot(snapshot),
    payload,
  });
  await registry.upsert(snapshot.alarmId, "snooze");
}

export async function reconcileSchedules(): Promise<void> {
  try {
    const alarms = useAlarmStore.getState().alarms;
    const registry = useAlarmRegistrationsStore.getState();
    const native = getAlarmScheduler();
    const alarmIds = new Set(alarms.map((a) => a.id));

    for (const record of registry.getAll()) {
      if (!alarmIds.has(record.alarmId)) {
        await native.cancelAllForAlarm(record.alarmId);
        await registry.removeForAlarm(record.alarmId);
      }
    }

    for (const alarm of alarms) {
      if (!alarm.enabled) {
        for (let w = 0; w <= 6; w++) {
          await native.cancel(identifierFor(alarm.id, w));
        }
        await native.cancel(snoozeIdentifierFor(alarm.id));
        await registry.remove(alarm.id, "snooze");
        await registry.remove(alarm.id, "weekly");
        continue;
      }

      const weekdays = expandWeekdays(alarm);
      for (const weekday of weekdays) {
        const identifier = identifierFor(alarm.id, weekday);
        await native.cancel(identifier);
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
      }
      await registry.upsert(alarm.id, "weekly");
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
    notificationTitle:
      get("notificationTitle") ?? DEFAULT_ALARM_NOTIFICATION_TITLE,
    notificationBody:
      get("notificationBody") ?? DEFAULT_ALARM_NOTIFICATION_BODY,
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
    notificationTitle:
      snapshot.notificationTitle ?? DEFAULT_ALARM_NOTIFICATION_TITLE,
    notificationBody:
      snapshot.notificationBody ?? DEFAULT_ALARM_NOTIFICATION_BODY,
  };
}
