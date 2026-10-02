import type {
  ActiveAlarmSnapshot,
  AlarmActivation,
  AlarmSnapshot,
  TaskType,
} from "./types";

export type PersistedActiveAlarmPayload =
  AlarmActivation | AlarmSnapshot | ActiveAlarmSnapshot;

export interface NormalizedActiveAlarmPayload {
  snapshot: AlarmSnapshot & { resolvedTask?: TaskType };
  activatedAt: number;
}

export function isLegacyActiveAlarmPayload(
  payload: PersistedActiveAlarmPayload,
): payload is AlarmSnapshot | ActiveAlarmSnapshot {
  return !("snapshot" in payload && "activatedAt" in payload);
}

export function normalizeActiveAlarmPayload(
  payload: PersistedActiveAlarmPayload,
): NormalizedActiveAlarmPayload {
  return isLegacyActiveAlarmPayload(payload)
    ? { snapshot: payload, activatedAt: 0 }
    : payload;
}
