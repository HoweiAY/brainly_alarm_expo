import type {
  ActiveAlarmSnapshot,
  AlarmActivation,
  AlarmSnapshot,
  TaskType,
} from "@/data/types";
import { resolveAlarmTask } from "@/tasks/randomTask";

export type { AlarmActivation } from "@/data/types";

export const SAME_TRIGGER_WINDOW_MS = 60_000;

/**
 * Matches alarm ID, weekday, and snooze state within 0–60,000 milliseconds
 * of the current activation, inclusive. Future activations do not match.
 *
 * @param now Current time in epoch milliseconds, compared with `activatedAt`.
 */
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

/**
 * Copies the incoming snapshot with a concrete dismissal task. For Random,
 * uses its supplied resolution when present; otherwise considers the current
 * resolution if {@link isSameTrigger} matches. An ineligible selection redraws.
 *
 * @param now Current time in epoch milliseconds for duplicate detection.
 * @param random Supplies a value in [0, 1) when a new draw is needed.
 * @throws Propagates errors from `random` when drawing.
 */
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

/**
 * Copies a snapshot without `resolvedTask`, preserving the configured task so
 * a scheduled Random alarm can draw again when it activates.
 */
export function toScheduledSnapshot(
  snapshot: AlarmSnapshot | ActiveAlarmSnapshot,
): AlarmSnapshot {
  const { resolvedTask: _resolvedTask, ...scheduled } =
    snapshot as Partial<ActiveAlarmSnapshot> & AlarmSnapshot;
  return scheduled;
}
