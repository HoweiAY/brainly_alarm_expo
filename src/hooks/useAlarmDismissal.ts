import { useRouter } from "expo-router";
import { useCallback } from "react";
import { getAlarmScheduler } from "@/alarms/AlarmScheduler";
import { stopAlarmSound } from "@/alarms/sound";
import { useAlarmFiringStore } from "@/store/alarmFiringStore";

export function useAlarmDismissal() {
  const router = useRouter();
  return useCallback(async () => {
    await Promise.allSettled([
      stopAlarmSound(),
      getAlarmScheduler().forceDismissFiring(),
    ]);
    useAlarmFiringStore.getState().clearActive();
    router.dismissTo("/(main)");
  }, [router]);
}
