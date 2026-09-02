import { describe, expect, it } from "@jest/globals";
import dayjs from "dayjs";
import {
  DEFAULT_TASK_TIMEOUT_CONFIG,
  createTaskTimeoutSchedule,
  getTaskTimeoutState,
  postponeTaskTimeout,
} from "@/tasks/taskTimeout";

const taskStartedAt = dayjs("2026-09-02T08:00:00.000Z");

describe("task timeout", () => {
  it("stays hidden during the initial 240-second delay", () => {
    const schedule = createTaskTimeoutSchedule(taskStartedAt);

    expect(
      getTaskTimeoutState(schedule, taskStartedAt.add(239_999, "millisecond")),
    ).toEqual({
      phase: "waiting",
      countdownVisible: false,
      remainingSeconds: 60,
    });
  });

  it("starts a 60-second countdown at the delay boundary", () => {
    const schedule = createTaskTimeoutSchedule(taskStartedAt);

    expect(
      getTaskTimeoutState(schedule, taskStartedAt.add(240, "second")),
    ).toEqual({
      phase: "countdown",
      countdownVisible: true,
      remainingSeconds: 60,
    });
  });

  it("rounds partial remaining seconds up", () => {
    const schedule = createTaskTimeoutSchedule(taskStartedAt);

    expect(
      getTaskTimeoutState(schedule, taskStartedAt.add(240_001, "millisecond")),
    ).toMatchObject({
      phase: "countdown",
      remainingSeconds: 60,
    });
    expect(
      getTaskTimeoutState(schedule, taskStartedAt.add(241, "second")),
    ).toMatchObject({
      phase: "countdown",
      remainingSeconds: 59,
    });
  });

  it("expires at the five-minute deadline", () => {
    const schedule = createTaskTimeoutSchedule(taskStartedAt);

    expect(
      getTaskTimeoutState(schedule, taskStartedAt.add(300, "second")),
    ).toEqual({
      phase: "expired",
      countdownVisible: false,
      remainingSeconds: 0,
    });
  });

  it("restarts a full countdown after every skip delay", () => {
    const firstSkipAt = taskStartedAt.add(250, "second");
    const firstPostponed = postponeTaskTimeout(firstSkipAt);

    expect(
      getTaskTimeoutState(
        firstPostponed,
        firstSkipAt.add(59_999, "millisecond"),
      ),
    ).toMatchObject({
      phase: "waiting",
      countdownVisible: false,
    });
    expect(
      getTaskTimeoutState(firstPostponed, firstSkipAt.add(60, "second")),
    ).toMatchObject({
      phase: "countdown",
      remainingSeconds: 60,
    });

    const secondSkipAt = firstSkipAt.add(70, "second");
    const secondPostponed = postponeTaskTimeout(secondSkipAt);
    expect(
      getTaskTimeoutState(secondPostponed, secondSkipAt.add(60, "second")),
    ).toMatchObject({
      phase: "countdown",
      remainingSeconds: 60,
    });
  });

  it("remains disabled when the timeout preference is off", () => {
    const schedule = createTaskTimeoutSchedule(taskStartedAt, {
      ...DEFAULT_TASK_TIMEOUT_CONFIG,
      enabled: false,
    });

    expect(
      getTaskTimeoutState(schedule, taskStartedAt.add(10, "minute"), false),
    ).toEqual({
      phase: "disabled",
      countdownVisible: false,
      remainingSeconds: 0,
    });
  });

  it("expires after a wall-clock jump beyond the deadline", () => {
    const schedule = createTaskTimeoutSchedule(taskStartedAt);

    expect(
      getTaskTimeoutState(schedule, taskStartedAt.add(2, "hour")).phase,
    ).toBe("expired");
  });
});
