import { useEffect } from "react";
import type { Alarm } from "@/data/types";
import { useAlarmStore } from "@/store/alarmStore";

export function useAlarmById(id: string | null | undefined) {
  const alarms = useAlarmStore((s) => s.alarms);
  const loaded = useAlarmStore((s) => s.loaded);

  useEffect(() => {
    useAlarmStore.getState().loadAlarms();
  }, []);

  const alarm: Alarm | null =
    id === null || id === undefined
      ? null
      : (alarms.find((a) => a.id === String(id)) ?? null);

  const loading = !loaded;
  return { alarm, loading };
}
