import { taskTypes } from "@/data/constants";
import type { AlarmTask, TaskType } from "@/data/types";

export const RANDOM_TASK_POOL: readonly TaskType[] = taskTypes.filter(
  (task) => task !== "None",
);

export function isRandomTaskCandidate(task: string | undefined): boolean {
  return (RANDOM_TASK_POOL as readonly string[]).includes(task ?? "");
}

export function pickRandomTask(random: () => number = Math.random): TaskType {
  const index = Math.min(
    RANDOM_TASK_POOL.length - 1,
    Math.floor(random() * RANDOM_TASK_POOL.length),
  );
  return RANDOM_TASK_POOL[index];
}

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
