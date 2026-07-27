import type { Difficulty, TaskType, Weekday } from "./types";

export const weekdays: Weekday[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

export const taskTypes: TaskType[] = ["Memory", "Math", "Shake phone", "None"];

export const taskDifficulties: Difficulty[] = ["Easy", "Normal", "Hard"];

export const weekdayToIndex: Record<Weekday, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export const indexToWeekday: Record<number, Weekday> = {
  0: "Mon",
  1: "Tue",
  2: "Wed",
  3: "Thu",
  4: "Fri",
  5: "Sat",
  6: "Sun",
};

export const taskTypeToStorage: Record<TaskType, string> = {
  Memory: "memory",
  Math: "math",
  "Shake phone": "shake_phone",
  None: "none",
};

export const storageToTaskType: Record<string, TaskType> = {
  memory: "Memory",
  math: "Math",
  shake_phone: "Shake phone",
  none: "None",
};

export const difficultyToIndex: Record<Difficulty, number> = {
  Easy: 0,
  Normal: 1,
  Hard: 2,
};

export const indexToDifficulty: Record<number, Difficulty> = {
  0: "Easy",
  1: "Normal",
  2: "Hard",
};
