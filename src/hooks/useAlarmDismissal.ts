import { stopAlarmSound } from "@/alarms/sound";
import { clearDeliveredAlarmNotifications } from "@/notifications/AlarmNotifications";
import { useAlarmFiringStore } from "@/store/alarmFiringStore";
import { useRouter } from "expo-router";
import { useCallback, useRef } from "react";

export function useAlarmDismissal() {
  const router = useRouter();
  const dismissingRef = useRef(false);
  return useCallback(async () => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    await Promise.allSettled([
      stopAlarmSound(),
      clearDeliveredAlarmNotifications(),
    ]);
    useAlarmFiringStore.getState().clearActive();
    router.dismissTo("/(main)");
  }, [router]);
}
