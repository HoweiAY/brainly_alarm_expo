import { getAlarmScheduler as getNativeAlarmScheduler } from "alarm-scheduler";
import type {
  AlarmScheduler,
  ScheduleOneShotOpts,
  ScheduleWeeklyOpts,
} from "./types";

function createStubAlarmScheduler(): AlarmScheduler {
  const noop = async () => {};
  return {
    scheduleWeekly: async (opts: ScheduleWeeklyOpts) => opts.identifier,
    scheduleOneShot: async (opts: ScheduleOneShotOpts) => opts.identifier,
    cancel: noop,
    cancelAllForAlarm: noop,
    requestExactAlarmPermission: async () => true,
    playAlarmSound: noop,
    stopAlarmSound: noop,
    forceDismissFiring: noop,
    addListener: () => ({ remove() {} }),
  };
}

let cached: AlarmScheduler | null = null;

export function getAlarmScheduler(): AlarmScheduler {
  if (cached) return cached;
  const native = getNativeAlarmScheduler();
  cached = native ?? createStubAlarmScheduler();
  return cached;
}
