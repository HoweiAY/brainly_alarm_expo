import { describe, expect, it } from "@jest/globals";
import type { Alarm } from "@/data/types";
import { computeNextAlarm } from "@/utils/time";

function baseAlarm(over: Partial<Alarm> = {}): Alarm {
  return {
    id: "alarm-1",
    days: [],
    hour: 8,
    minute: 0,
    task: "Memory",
    rounds: 1,
    difficulty: "Easy",
    sound: null,
    snooze: true,
    enabled: true,
    ...over,
  };
}

describe("computeNextAlarm", () => {
  it("returns null when no alarms are enabled", () => {
    const now = new Date(2024, 0, 3, 10, 0, 0, 0);
    expect(computeNextAlarm([baseAlarm({ enabled: false })], now)).toBeNull();
  });

  it("returns null when alarms list is empty", () => {
    const now = new Date(2024, 0, 3, 10, 0, 0, 0);
    expect(computeNextAlarm([], now)).toBeNull();
  });

  describe("boundary conditions", () => {
    const now = new Date(2024, 0, 3, 10, 0, 0, 0);

    it("rolls forward one week when candidate equals now", () => {
      const result = computeNextAlarm(
        [baseAlarm({ days: ["Wed"], hour: 10, minute: 0 })],
        now,
      );
      expect(result).toEqual({ days: 7, hours: 0, minutes: 0 });
    });

    it("does not roll forward when candidate is one minute after now", () => {
      const result = computeNextAlarm(
        [baseAlarm({ days: ["Wed"], hour: 10, minute: 1 })],
        now,
      );
      expect(result).toEqual({ days: 0, hours: 0, minutes: 1 });
    });

    it("rolls forward one week when candidate is one minute before now", () => {
      const result = computeNextAlarm(
        [baseAlarm({ days: ["Wed"], hour: 9, minute: 59 })],
        now,
      );
      expect(result).toEqual({ days: 6, hours: 23, minutes: 59 });
    });
  });
});
