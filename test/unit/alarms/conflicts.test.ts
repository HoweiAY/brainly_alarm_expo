import { describe, expect, it } from "@jest/globals";
import { daysOverlap, findConflictingAlarm } from "@/alarms/conflicts";
import type { Alarm } from "@/data/types";

function makeAlarm(
  id: string,
  hour: number,
  minute: number,
  days: Alarm["days"],
  enabled = true,
): Alarm {
  return {
    id,
    days,
    hour,
    minute,
    task: "Memory",
    rounds: 1,
    difficulty: "Easy",
    sound: null,
    snooze: true,
    enabled,
  };
}

describe("daysOverlap", () => {
  it("empty overlaps empty (both every day)", () => {
    expect(daysOverlap([], [])).toBe(true);
  });

  it("empty overlaps a single weekday", () => {
    expect(daysOverlap([], ["Mon"])).toBe(true);
    expect(daysOverlap(["Wed"], [])).toBe(true);
  });

  it("disjoint weekdays do not overlap", () => {
    expect(daysOverlap(["Mon", "Tue"], ["Wed", "Thu"])).toBe(false);
  });

  it("shared weekday overlaps", () => {
    expect(daysOverlap(["Mon", "Tue"], ["Tue", "Wed"])).toBe(true);
  });
});

describe("findConflictingAlarm", () => {
  it("returns null when no alarm matches", () => {
    const alarms = [makeAlarm("a", 8, 0, ["Mon"])];
    expect(
      findConflictingAlarm(alarms, { hour: 9, minute: 0, days: ["Mon"] }),
    ).toBeNull();
  });

  it("finds a same-time overlapping-day alarm (disabled still counts)", () => {
    const alarms = [makeAlarm("a", 8, 0, ["Mon"], false)];
    expect(
      findConflictingAlarm(alarms, { hour: 8, minute: 0, days: ["Mon"] }),
    ).not.toBeNull();
  });

  it("same time, disjoint days is not a conflict", () => {
    const alarms = [makeAlarm("a", 8, 0, ["Mon"])];
    expect(
      findConflictingAlarm(alarms, { hour: 8, minute: 0, days: ["Tue"] }),
    ).toBeNull();
  });

  it("candidate every-day overlaps a single-day alarm", () => {
    const alarms = [makeAlarm("a", 8, 0, ["Mon"])];
    expect(
      findConflictingAlarm(alarms, { hour: 8, minute: 0, days: [] }),
    ).not.toBeNull();
  });

  it("excludes the alarm by id (self never conflicts)", () => {
    const alarms = [makeAlarm("a", 8, 0, ["Mon"])];
    expect(
      findConflictingAlarm(alarms, { hour: 8, minute: 0, days: ["Mon"] }, "a"),
    ).toBeNull();
  });

  it("returns the first conflicting alarm", () => {
    const alarms = [
      makeAlarm("a", 7, 0, ["Mon"]),
      makeAlarm("b", 8, 0, ["Mon"]),
    ];
    const result = findConflictingAlarm(alarms, {
      hour: 8,
      minute: 0,
      days: ["Mon"],
    });
    expect(result?.id).toBe("b");
  });
});
