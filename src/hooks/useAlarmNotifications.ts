import {
  parseAlarmSnapshot,
  resetAlarm,
  snapshotToQueryParams,
} from "@/alarms/scheduling";
import { getAlarmScheduler } from "@/alarms/AlarmScheduler";
import {
  playAlarmSound,
  stopAlarmSound,
  soundUriFromSnapshot,
} from "@/alarms/sound";
import {
  clearDeliveredAlarmNotifications,
  initAlarmNotifications,
} from "@/notifications/AlarmNotifications";
import type { AlarmSnapshot } from "@/data/types";
import { useAlarmFiringStore } from "@/store/alarmFiringStore";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { AppState } from "react-native";

function snapshotFromNotificationData(
  data: Record<string, unknown> | undefined,
): AlarmSnapshot | null {
  if (!data) return null;
  return parseAlarmSnapshot(
    data as Record<string, string | string[] | undefined>,
  );
}

function navigateToAlarm(
  router: ReturnType<typeof useRouter>,
  snapshot: AlarmSnapshot,
): void {
  try {
    router.replace({
      pathname: "/alarm",
      params: snapshotToQueryParams(snapshot),
    });
  } catch {
    // The router may not be ready during a cold-launch notification response;
    // the deep-link handler in the root layout covers that path as well.
  }
}

export async function dismissOldAlarmIfActive(
  incoming?: AlarmSnapshot,
): Promise<void> {
  const oldSnapshot = useAlarmFiringStore.getState().activeSnapshot;
  if (!oldSnapshot) return;
  if (incoming && incoming.alarmId === oldSnapshot.alarmId) return;
  await stopAlarmSound();
  await getAlarmScheduler().forceDismissFiring();
  await resetAlarm(oldSnapshot);
}

export function useAlarmNotifications() {
  const router = useRouter();

  useEffect(() => {
    void initAlarmNotifications();

    const firedSub = getAlarmScheduler().addListener(
      "onAlarmFired",
      (snapshot) => {
        void (async () => {
          await dismissOldAlarmIfActive();
          useAlarmFiringStore.getState().setActive(snapshot);
          navigateToAlarm(router, snapshot);
        })();
      },
    );

    const dismissedSub = getAlarmScheduler().addListener(
      "onAlarmDismissed",
      () => {
        void clearDeliveredAlarmNotifications();
      },
    );

    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const snapshot = snapshotFromNotificationData(
          notification.request.content.data as
            Record<string, unknown> | undefined,
        );
        if (!snapshot) return;
        void (async () => {
          await dismissOldAlarmIfActive(snapshot);
          useAlarmFiringStore.getState().setActive(snapshot);
          await playAlarmSound(soundUriFromSnapshot(snapshot));
          navigateToAlarm(router, snapshot);
        })();
      },
    );

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const snapshot = snapshotFromNotificationData(
          response.notification.request.content.data as
            Record<string, unknown> | undefined,
        );
        if (!snapshot) return;
        void (async () => {
          await dismissOldAlarmIfActive(snapshot);
          useAlarmFiringStore.getState().setActive(snapshot);
          await playAlarmSound(soundUriFromSnapshot(snapshot));
          navigateToAlarm(router, snapshot);
          void clearDeliveredAlarmNotifications();
        })();
      },
    );

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") void clearDeliveredAlarmNotifications();
    });

    return () => {
      firedSub.remove();
      dismissedSub.remove();
      receivedSub.remove();
      responseSub.remove();
      appStateSub.remove();
    };
  }, [router]);
}
