import type { Difficulty, TaskType, Weekday } from "@/data/types";
import type { TFunction } from "i18next";

const weekdayKeys = {
  Mon: "common.weekdays.Mon",
  Tue: "common.weekdays.Tue",
  Wed: "common.weekdays.Wed",
  Thu: "common.weekdays.Thu",
  Fri: "common.weekdays.Fri",
  Sat: "common.weekdays.Sat",
  Sun: "common.weekdays.Sun",
} as const;

const taskKeys = {
  Memory: "common.tasks.Memory",
  Math: "common.tasks.Math",
  "Shake phone": "common.tasks.ShakePhone",
  None: "common.tasks.None",
} as const;

const difficultyKeys = {
  Easy: "common.difficulties.Easy",
  Normal: "common.difficulties.Normal",
  Hard: "common.difficulties.Hard",
} as const;

export function translateWeekday(t: TFunction, weekday: Weekday): string {
  return t(weekdayKeys[weekday]);
}

export function translateTask(t: TFunction, task: TaskType): string {
  return t(taskKeys[task]);
}

export function translateDifficulty(
  t: TFunction,
  difficulty: Difficulty,
): string {
  return t(difficultyKeys[difficulty]);
}
