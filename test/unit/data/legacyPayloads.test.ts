import { describe, expect, it } from "@jest/globals";
import { normalizeActiveAlarmPayload } from "@/data/legacyPayloads";
import type { AlarmActivation, AlarmSnapshot } from "@/data/types";

const snapshot: AlarmSnapshot = {
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

describe("normalizeActiveAlarmPayload", () => {
  it("returns a current activation unchanged", () => {
    const activation: AlarmActivation = {
      snapshot: { ...snapshot, resolvedTask: "Math" },
      activatedAt: 1_700_000_000_000,
    };
    expect(normalizeActiveAlarmPayload(activation)).toBe(activation);
  });

  it("wraps a legacy snapshot with activatedAt 0", () => {
    expect(normalizeActiveAlarmPayload(snapshot)).toEqual({
      snapshot,
      activatedAt: 0,
    });
  });

  it("wraps a legacy active snapshot and keeps its resolved task", () => {
    const legacy = { ...snapshot, resolvedTask: "Memory" as const };
    expect(normalizeActiveAlarmPayload(legacy)).toEqual({
      snapshot: legacy,
      activatedAt: 0,
    });
  });
});
