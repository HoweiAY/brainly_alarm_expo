import {
  requireOptionalNativeModule,
  type EventSubscription,
} from "expo-modules-core";
import type { AlarmSnapshot } from "@/data/types";

export interface ScheduleWeeklyOpts {
  identifier: string;
  alarmId: string;
  weekday: number;
  hour: number;
  minute: number;
  soundUri: string | null;
  payload: AlarmSnapshot;
}

export interface ScheduleOneShotOpts {
  identifier: string;
  alarmId: string;
  triggerAt: number;
  soundUri: string | null;
  payload: AlarmSnapshot;
}

export type AlarmEventName = "onAlarmFired" | "onAlarmDismissed";

export interface AlarmScheduler {
  scheduleWeekly(opts: ScheduleWeeklyOpts): Promise<string>;
  scheduleOneShot(opts: ScheduleOneShotOpts): Promise<string>;
  cancel(identifier: string): Promise<void>;
  cancelAllForAlarm(alarmId: string): Promise<void>;
  requestExactAlarmPermission(): Promise<boolean>;
  playAlarmSound(soundUri: string | null): Promise<void>;
  stopAlarmSound(): Promise<void>;
  forceDismissFiring(): Promise<void>;
  addListener(
    type: AlarmEventName,
    cb: (payload: AlarmSnapshot) => void,
  ): EventSubscription;
}

export function getAlarmScheduler(): AlarmScheduler | null {
  return requireOptionalNativeModule<AlarmScheduler>("AlarmScheduler");
}
