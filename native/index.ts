import type { AlarmSnapshot } from "@/data/types";
import {
  requireOptionalNativeModule,
  type EventSubscription,
} from "expo-modules-core";

export interface ScheduleWeeklyOpts {
  identifier: string;
  weekday: number;
  hour: number;
  minute: number;
  payload: AlarmSnapshot;
}

export interface ScheduleOneShotOpts {
  identifier: string;
  triggerAt: number;
  payload: AlarmSnapshot;
}

export type AlarmEventName = "onAlarmFired";

export interface AlarmScheduler {
  scheduleWeekly(opts: ScheduleWeeklyOpts): Promise<string>;
  scheduleOneShot(opts: ScheduleOneShotOpts): Promise<string>;
  cancel(identifier: string): Promise<void>;
  cancelAllForAlarm(alarmId: string): Promise<void>;
  requestExactAlarmPermission(): Promise<boolean>;
  playAlarmSound(soundUri: string | null): Promise<void>;
  stopAlarmSound(): Promise<void>;
  addListener(
    type: AlarmEventName,
    cb: (payload: AlarmSnapshot) => void,
  ): EventSubscription;
}

export function getAlarmScheduler(): AlarmScheduler | null {
  return requireOptionalNativeModule<AlarmScheduler>("AlarmScheduler");
}
