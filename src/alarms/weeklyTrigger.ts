import { weekdayToIndex } from "@/data/constants";
import type { Alarm } from "@/data/types";
import { clampSnoozeMinutes } from "@/settings/userSettings";
import dayjs, { type Dayjs } from "dayjs";

export function expandWeekdays(alarm: Alarm): number[] {
  return alarm.days.length
    ? alarm.days.map((d) => weekdayToIndex[d])
    : [0, 1, 2, 3, 4, 5, 6];
}

export function identifierFor(alarmId: string, weekdayIndex: number): string {
  return `${alarmId}:${weekdayIndex}`;
}

export function snoozeIdentifierFor(alarmId: string): string {
  return `${alarmId}:snooze`;
}

export function snoozeTriggerTime(now: Dayjs, minutes: number): number {
  return now.add(clampSnoozeMinutes(minutes), "minute").valueOf();
}

// weekdayIndex uses Mon=0..Sun=6 (src/data/constants weekdayToIndex).
// dayjs .day() uses Sun=0..Sat=6, hence the (weekdayIndex + 1) % 7 mapping.
export function nextWeeklyTriggerTime(
  weekdayIndex: number,
  hour: number,
  minute: number,
  now: number,
  reset = false,
): number {
  const nowDayjs = dayjs(now).second(0).millisecond(0);
  const dow = (weekdayIndex + 1) % 7;
  let candidate = nowDayjs
    .day(dow)
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0);
  if (reset) {
    candidate = candidate.add(7, "day");
  } else if (candidate.valueOf() <= now) {
    candidate = candidate.add(7, "day");
  }
  return candidate.valueOf();
}
