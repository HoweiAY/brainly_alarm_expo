import type {
  ActiveAlarmSnapshot,
  AlarmActivation,
  AlarmSnapshot,
  TaskType,
} from "@/data/types";
import { resolveAlarmTask } from "@/tasks/randomTask";

export type { AlarmActivation } from "@/data/types";

export const SAME_TRIGGER_WINDOW_MS = 60_000;

export function isSameTrigger(
  incoming: AlarmSnapshot,
  current: AlarmActivation | null,
  now: number,
): current is AlarmActivation {
  return (
    current !== null &&
    current.snapshot.alarmId === incoming.alarmId &&
    current.snapshot.weekday === incoming.weekday &&
    current.snapshot.isSnoozed === incoming.isSnoozed &&
    now - current.activatedAt >= 0 &&
    now - current.activatedAt <= SAME_TRIGGER_WINDOW_MS
  );
}

export function resolveActiveSnapshot(
  incoming: AlarmSnapshot & { resolvedTask?: TaskType },
  current: AlarmActivation | null,
  now: number,
  random: () => number = Math.random,
): ActiveAlarmSnapshot {
  const previous =
    incoming.resolvedTask ??
    (isSameTrigger(incoming, current, now)
      ? current.snapshot.resolvedTask
      : undefined);
  return {
    ...incoming,
    resolvedTask: resolveAlarmTask(incoming.task, previous, random),
  };
}

export function toScheduledSnapshot(
  snapshot: AlarmSnapshot | ActiveAlarmSnapshot,
): AlarmSnapshot {
  const { resolvedTask: _resolvedTask, ...scheduled } =
    snapshot as Partial<ActiveAlarmSnapshot> & AlarmSnapshot;
  return scheduled;
}
