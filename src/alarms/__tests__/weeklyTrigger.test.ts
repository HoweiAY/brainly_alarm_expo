import { describe, expect, it } from "@jest/globals";
import type { Alarm } from "@/data/types";
import {
  expandWeekdays,
  identifierFor,
  nextWeeklyTriggerTime,
  snoozeIdentifierFor,
} from "../weeklyTrigger";

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

describe("expandWeekdays", () => {
  it("returns all 7 weekdays when days is empty", () => {
    expect(expandWeekdays(baseAlarm({ days: [] }))).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it("maps selected weekdays to Mon=0..Sun=6 indices", () => {
    expect(expandWeekdays(baseAlarm({ days: ["Mon", "Wed", "Sun"] }))).toEqual([
      0, 2, 6,
    ]);
  });
});

describe("identifierFor / snoozeIdentifierFor", () => {
  it("builds an id:weekday scheduling key", () => {
    expect(identifierFor("abc", 3)).toBe("abc:3");
  });

  it("builds a distinct snooze key", () => {
    expect(snoozeIdentifierFor("abc")).toBe("abc:snooze");
    expect(identifierFor("abc", 3)).not.toBe(snoozeIdentifierFor("abc"));
  });
});

describe("nextWeeklyTriggerTime", () => {
  // Fixed "now": Wednesday 2024-01-03 10:00 local time.
  // weekdayIndex uses Mon=0..Sun=6, so Wednesday = 2.
  const now = new Date(2024, 0, 3, 10, 0, 0, 0).getTime();

  it("fires later today on the same weekday", () => {
    const t = nextWeeklyTriggerTime(2, 11, 0, now);
    expect(new Date(t).getDate()).toBe(3);
    expect(new Date(t).getHours()).toBe(11);
  });

  it("advances to next week when today's slot already passed", () => {
    const t = nextWeeklyTriggerTime(2, 8, 0, now);
    expect(new Date(t).getDate()).toBe(10);
    expect(new Date(t).getHours()).toBe(8);
  });

  it("schedules a future weekday later this week", () => {
    // Friday (index 4) at 09:00 -> Jan 5
    const t = nextWeeklyTriggerTime(4, 9, 0, now);
    expect(new Date(t).getDate()).toBe(5);
  });

  it("advances to next week for a past weekday this week", () => {
    // Monday (index 0) was Jan 1 -> next Mon Jan 8
    const t = nextWeeklyTriggerTime(0, 9, 0, now);
    expect(new Date(t).getDate()).toBe(8);
  });

  it("reset forces +7 days from the matching slot", () => {
    const t = nextWeeklyTriggerTime(2, 8, 0, now, true);
    expect(new Date(t).getDate()).toBe(10);
    expect(new Date(t).getHours()).toBe(8);
  });

  it("handles the Sunday wrap-around (index 6)", () => {
    // Sunday (index 6) -> next Sunday Jan 7 at 09:00
    const t = nextWeeklyTriggerTime(6, 9, 0, now);
    expect(new Date(t).getDate()).toBe(7);
  });
});
