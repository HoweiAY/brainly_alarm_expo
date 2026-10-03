import {
  isLegacyUserSettingsPayload,
  normalizeActiveAlarmPayload,
} from "@/data/legacyPayloads";
import type { AlarmActivation, AlarmSnapshot } from "@/data/types";
import { describe, expect, it } from "@jest/globals";

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

  it.each([
    ["scalar", "not an alarm"],
    ["incomplete snapshot", { alarmId: "alarm-1" }],
    [
      "activation with an incomplete snapshot",
      {
        snapshot: { alarmId: "alarm-1" },
        activatedAt: 1_700_000_000_000,
      },
    ],
    [
      "activation without a resolved task",
      {
        snapshot,
        activatedAt: 1_700_000_000_000,
      },
    ],
  ])("rejects a %s", (_label, payload) => {
    expect(normalizeActiveAlarmPayload(payload)).toBeNull();
  });
});

describe("isLegacyUserSettingsPayload", () => {
  it("accepts a current settings payload", () => {
    expect(
      isLegacyUserSettingsPayload({ language: "en", colorScheme: "light" }),
    ).toBe(false);
  });

  it.each([
    ["missing language", { colorScheme: "dark" }],
    ["missing color scheme", { language: "zh-Hant" }],
    ["invalid color scheme", { language: "en", colorScheme: "system" }],
    ["non-object payload", null],
  ])("flags a %s", (_label, payload) => {
    expect(isLegacyUserSettingsPayload(payload)).toBe(true);
  });
});
