import { taskTypes } from "@/data/constants";
import type { AlarmTask, TaskType } from "@/data/types";

export const RANDOM_TASK_POOL: readonly TaskType[] = taskTypes.filter(
  (task) => task !== "None",
);

/** Returns whether the task is in the random pool, excluding None and Random. */
export function isRandomTaskCandidate(task: string | undefined): boolean {
  return (RANDOM_TASK_POOL as readonly string[]).includes(task ?? "");
}

/**
 * Picks Memory, Math, or Shake phone using one draw from `random`.
 *
 * @param random Supplies a value in [0, 1); a uniform source gives equal chances.
 * Values at or above 1 select the last task; negative values and NaN yield undefined.
 * @throws Propagates errors from `random`.
 */
export function pickRandomTask(random: () => number = Math.random): TaskType {
  const index = Math.min(
    RANDOM_TASK_POOL.length - 1,
    Math.floor(random() * RANDOM_TASK_POOL.length),
  );
  return RANDOM_TASK_POOL[index];
}

/**
 * Returns a concrete configured task unchanged. For Random, reuses `previous`
 * if it belongs to the random pool; otherwise draws with {@link pickRandomTask}.
 *
 * @param random Supplies a value in [0, 1) when a new draw is needed.
 * @throws Propagates errors from `random` when drawing.
 */
export function resolveAlarmTask(
  task: AlarmTask,
  previous?: TaskType,
  random: () => number = Math.random,
): TaskType {
  if (task !== "Random") return task;
  return previous && isRandomTaskCandidate(previous)
    ? previous
    : pickRandomTask(random);
}
