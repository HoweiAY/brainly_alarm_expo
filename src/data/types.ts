export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type TaskType = "Memory" | "Math" | "Shake phone" | "None";

export type Difficulty = "Easy" | "Normal" | "Hard";

export interface Alarm {
  id: string;
  days: Weekday[];
  hour: number;
  minute: number;
  task: TaskType;
  rounds: number;
  difficulty: Difficulty;
  sound: string | null;
  snooze: boolean;
  enabled: boolean;
}
