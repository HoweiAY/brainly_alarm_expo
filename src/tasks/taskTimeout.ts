import type { Dayjs } from "dayjs";

export interface TaskTimeoutConfig {
  enabled: boolean;
  initialDelayMs: number;
  countdownMs: number;
  skipDelayMs: number;
}

export interface TaskTimeoutSchedule {
  countdownStartsAt: Dayjs;
  dismissesAt: Dayjs;
}

export type TaskTimeoutPhase = "disabled" | "waiting" | "countdown" | "expired";

export interface TaskTimeoutState {
  phase: TaskTimeoutPhase;
  countdownVisible: boolean;
  remainingSeconds: number;
}

export const DEFAULT_TASK_TIMEOUT_CONFIG: Readonly<TaskTimeoutConfig> = {
  enabled: true,
  initialDelayMs: 240_000,
  countdownMs: 60_000,
  skipDelayMs: 60_000,
};

function scheduleAfter(
  now: Dayjs,
  delayMs: number,
  countdownMs: number,
): TaskTimeoutSchedule {
  const countdownStartsAt = now.add(delayMs, "millisecond");
  return {
    countdownStartsAt,
    dismissesAt: countdownStartsAt.add(countdownMs, "millisecond"),
  };
}

export function createTaskTimeoutSchedule(
  taskStartedAt: Dayjs,
  config: TaskTimeoutConfig = DEFAULT_TASK_TIMEOUT_CONFIG,
): TaskTimeoutSchedule {
  return scheduleAfter(
    taskStartedAt,
    config.initialDelayMs,
    config.countdownMs,
  );
}

export function postponeTaskTimeout(
  now: Dayjs,
  config: TaskTimeoutConfig = DEFAULT_TASK_TIMEOUT_CONFIG,
): TaskTimeoutSchedule {
  return scheduleAfter(now, config.skipDelayMs, config.countdownMs);
}

export function getTaskTimeoutState(
  schedule: TaskTimeoutSchedule,
  now: Dayjs,
  enabled = true,
): TaskTimeoutState {
  if (!enabled) {
    return {
      phase: "disabled",
      countdownVisible: false,
      remainingSeconds: 0,
    };
  }

  if (now.isBefore(schedule.countdownStartsAt)) {
    return {
      phase: "waiting",
      countdownVisible: false,
      remainingSeconds: Math.ceil(
        schedule.dismissesAt.diff(schedule.countdownStartsAt) / 1000,
      ),
    };
  }

  const remainingMs = schedule.dismissesAt.diff(now);
  if (remainingMs <= 0) {
    return {
      phase: "expired",
      countdownVisible: false,
      remainingSeconds: 0,
    };
  }

  return {
    phase: "countdown",
    countdownVisible: true,
    remainingSeconds: Math.ceil(remainingMs / 1000),
  };
}
