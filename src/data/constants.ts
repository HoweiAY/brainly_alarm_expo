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
