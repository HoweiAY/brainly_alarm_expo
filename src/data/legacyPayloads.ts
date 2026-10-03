import { isAppLanguage } from "@/i18n/languages";
import { isAppColorScheme } from "@/settings/userSettings";
import { alarmTasks, taskDifficulties, taskTypes } from "./constants";
import type {
  ActiveAlarmSnapshot,
  AlarmActivation,
  AlarmSnapshot,
  TaskType,
} from "./types";

export interface NormalizedActiveAlarmPayload {
  snapshot: AlarmSnapshot & { resolvedTask?: TaskType };
  activatedAt: number;
}

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return payload !== null && typeof payload === "object";
}

function isOneOf<T extends string>(
  value: unknown,
  values: readonly T[],
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isAlarmSnapshot(payload: unknown): payload is AlarmSnapshot {
  if (!isRecord(payload)) return false;
  return (
    typeof payload.alarmId === "string" &&
    isIntegerInRange(payload.weekday, 0, 6) &&
    isIntegerInRange(payload.hour, 0, 23) &&
    isIntegerInRange(payload.minute, 0, 59) &&
    isOneOf(payload.task, alarmTasks) &&
    isIntegerInRange(payload.roundCount, 1, 5) &&
    isOneOf(payload.difficulty, taskDifficulties) &&
    typeof payload.sound === "string" &&
    typeof payload.snooze === "boolean" &&
    typeof payload.enabled === "boolean" &&
    typeof payload.isSnoozed === "boolean" &&
    typeof payload.notificationTitle === "string" &&
    typeof payload.notificationBody === "string"
  );
}

function isAlarmActivation(payload: unknown): payload is AlarmActivation {
  if (!isRecord(payload) || !isAlarmSnapshot(payload.snapshot)) return false;
  return (
    isOneOf(
      (payload.snapshot as { resolvedTask?: unknown }).resolvedTask,
      taskTypes,
    ) &&
    typeof payload.activatedAt === "number" &&
    Number.isFinite(payload.activatedAt)
  );
}

export function isLegacyActiveAlarmPayload(
  payload: unknown,
): payload is AlarmSnapshot | ActiveAlarmSnapshot {
  return (
    isAlarmSnapshot(payload) &&
    !("snapshot" in payload || "activatedAt" in payload)
  );
}

export function normalizeActiveAlarmPayload(
  payload: unknown,
): NormalizedActiveAlarmPayload | null {
  if (isLegacyActiveAlarmPayload(payload)) {
    return { snapshot: payload, activatedAt: 0 };
  }
  return isAlarmActivation(payload) ? payload : null;
}

export function isLegacyUserSettingsPayload(payload: unknown): boolean {
  const source =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  return (
    !isAppLanguage(source.language) || !isAppColorScheme(source.colorScheme)
  );
}
