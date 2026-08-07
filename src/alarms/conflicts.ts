import type { Alarm, Weekday } from "@/data/types";

const ALL_WEEKDAYS: Weekday[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

export function daysOverlap(a: Weekday[], b: Weekday[]): boolean {
  const setA = a.length === 0 ? ALL_WEEKDAYS : a;
  const setB = b.length === 0 ? ALL_WEEKDAYS : b;
  if (setA === ALL_WEEKDAYS || setB === ALL_WEEKDAYS) return true;
  return setA.some((day) => setB.includes(day));
}

export interface ConflictCandidate {
  hour: number;
  minute: number;
  days: Weekday[];
}

export function findConflictingAlarm(
  alarms: Alarm[],
  candidate: ConflictCandidate,
  excludeId?: string,
): Alarm | null {
  for (const alarm of alarms) {
    if (excludeId != null && alarm.id === excludeId) continue;
    if (
      alarm.hour === candidate.hour &&
      alarm.minute === candidate.minute &&
      daysOverlap(alarm.days, candidate.days)
    ) {
      return alarm;
    }
  }
  return null;
}
