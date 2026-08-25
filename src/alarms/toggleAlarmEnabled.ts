import type { Alarm } from "@/data/types";

export interface ToggleAlarmDeps {
  updateAlarm: (alarm: Alarm) => Promise<void>;
  setAlarm: (alarm: Alarm) => Promise<void>;
  cancelAlarm: (alarm: { id: string }) => Promise<void>;
}

export async function toggleAlarmEnabled(
  alarm: Alarm,
  deps: ToggleAlarmDeps,
): Promise<boolean> {
  const next = { ...alarm, enabled: !alarm.enabled };
  let storeUpdated = false;

  try {
    await deps.updateAlarm(next);
    storeUpdated = true;
    if (next.enabled) await deps.setAlarm(next);
    else await deps.cancelAlarm(next);
    return true;
  } catch (e) {
    console.error("toggleAlarmEnabled failed", e);
    if (storeUpdated) {
      try {
        await deps.updateAlarm(alarm);
        await deps.setAlarm(alarm);
      } catch (rollbackError) {
        console.error("toggleAlarmEnabled rollback failed", rollbackError);
      }
    }
    return false;
  }
}
