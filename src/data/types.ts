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

export interface AlarmSnapshot {
  alarmId: string;
  weekday: number;
  hour: number;
  minute: number;
  task: TaskType;
  roundCount: number;
  difficulty: Difficulty;
  sound: string;
  snooze: boolean;
  enabled: boolean;
  isSnoozed: boolean;
}

export type ScheduledAlarmType = "weekly" | "snooze" | "oneshot";

export interface ScheduledAlarmRecord {
  id: string;
  alarmId: string;
  weekday: number | null;
  type: ScheduledAlarmType;
  triggerAt: number;
  payload: AlarmSnapshot;
  createdAt: number;
  updatedAt: number;
}
