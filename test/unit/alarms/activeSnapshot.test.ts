import { describe, expect, it } from "@jest/globals";
import {
  SAME_TRIGGER_WINDOW_MS,
  resolveActiveSnapshot,
  toScheduledSnapshot,
  type AlarmActivation,
} from "@/alarms/activeSnapshot";
import type { AlarmSnapshot } from "@/data/types";

const now = 1_000_000;

const randomSnapshot: AlarmSnapshot = {
  alarmId: "alarm-1",
  weekday: 0,
  hour: 8,
  minute: 30,
  task: "Random",
  roundCount: 2,
  difficulty: "Normal",
  sound: "Default",
  snooze: true,
  enabled: true,
  isSnoozed: false,
  notificationTitle: "Time to wake up!",
  notificationBody: "Click to disable the alarm.",
};

function activation(
  overrides: Partial<AlarmSnapshot> = {},
  activatedAt = now,
): AlarmActivation {
  return {
    snapshot: { ...randomSnapshot, ...overrides, resolvedTask: "Shake phone" },
    activatedAt,
  };
}

describe("resolveActiveSnapshot", () => {
  it("draws a task for a new Random trigger", () => {
    const active = resolveActiveSnapshot(randomSnapshot, null, now, () => 0.5);
    expect(active.task).toBe("Random");
    expect(active.resolvedTask).toBe("Math");
  });

  it("keeps an explicit resolved task", () => {
    const active = resolveActiveSnapshot(
      { ...randomSnapshot, resolvedTask: "Memory" },
      activation(),
      now,
      () => 0.99,
    );
    expect(active.resolvedTask).toBe("Memory");
  });

  it("reuses the draw for duplicate deliveries of the same trigger", () => {
    const active = resolveActiveSnapshot(
      randomSnapshot,
      activation({}, now - SAME_TRIGGER_WINDOW_MS),
      now,
      () => 0,
    );
    expect(active.resolvedTask).toBe("Shake phone");
  });

  it("draws again once the same-trigger window has passed", () => {
    const active = resolveActiveSnapshot(
      randomSnapshot,
      activation({}, now - SAME_TRIGGER_WINDOW_MS - 1),
      now,
      () => 0,
    );
    expect(active.resolvedTask).toBe("Memory");
  });

  it.each([
    ["alarm", { alarmId: "alarm-2" }],
    ["weekday", { weekday: 1 }],
    ["snooze state", { isSnoozed: true }],
  ])("draws again for a different %s", (_label, overrides) => {
    const active = resolveActiveSnapshot(
      randomSnapshot,
      activation(overrides),
      now,
      () => 0,
    );
    expect(active.resolvedTask).toBe("Memory");
  });

  it("never randomizes a concrete task", () => {
    const active = resolveActiveSnapshot(
      { ...randomSnapshot, task: "None" },
      activation(),
      now,
      () => 0,
    );
    expect(active.resolvedTask).toBe("None");
  });
});

describe("toScheduledSnapshot", () => {
  it("strips the resolved task and keeps the configured task", () => {
    const scheduled = toScheduledSnapshot({
      ...randomSnapshot,
      resolvedTask: "Math",
    });
    expect(scheduled).toEqual(randomSnapshot);
    expect(scheduled).not.toHaveProperty("resolvedTask");
  });
});
