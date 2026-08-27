import type { Dayjs } from "dayjs";
import { weekdays } from "@/data/constants";
import type { Alarm, Weekday } from "@/data/types";

const WEEKDAY_DOW: Record<Weekday, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getDaysString(days: Weekday[]): string {
  const present = weekdays.filter((w) => days.includes(w));
  if (present.length === 0 || present.length === weekdays.length) {
    return "Every day";
  }
  return present.join(", ");
}

export interface AlarmDelta {
  days: number;
  hours: number;
  minutes: number;
}

function msToDelta(ms: number): AlarmDelta {
  const totalMinutes = Math.floor(ms / 60000);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);
  return { days, hours, minutes };
}

export function computeNextAlarm(
  alarms: Alarm[],
  now: Dayjs,
): AlarmDelta | null {
  const enabled = alarms.filter((a) => a.enabled);
  if (enabled.length === 0) return null;

  const nowDayjs = now.second(0).millisecond(0);

  let bestMs: number | null = null;
  for (const alarm of enabled) {
    const days: readonly Weekday[] =
      alarm.days.length > 0 ? alarm.days : weekdays;
    for (const weekday of days) {
      const candidate = nowDayjs
        .day(WEEKDAY_DOW[weekday])
        .hour(alarm.hour)
        .minute(alarm.minute)
        .second(0)
        .millisecond(0);
      const adjusted =
        candidate.valueOf() <= nowDayjs.valueOf()
          ? candidate.add(7, "day")
          : candidate;
      const ms = adjusted.valueOf() - nowDayjs.valueOf();
      if (bestMs === null || ms < bestMs) bestMs = ms;
    }
  }

  if (bestMs === null) return null;
  return msToDelta(bestMs);
}

export function formatCountdown(delta: AlarmDelta | null): string {
  if (delta === null) return "No alarms set";
  return `Next alarm in ${delta.days} day(s) ${delta.hours} hour(s) ${delta.minutes} minute(s)`;
}
