import { useRouter } from "expo-router";
import { useCallback } from "react";
import { getAlarmScheduler } from "@/alarms/AlarmScheduler";
import { stopAlarmSound } from "@/alarms/sound";

export function useAlarmDismissal() {
  const router = useRouter();
  return useCallback(async () => {
    await stopAlarmSound();
    await getAlarmScheduler().forceDismissFiring();
    router.dismissTo("/(main)");
  }, [router]);
}
