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

let activeActivationId: string | null = null;

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
  if (!incoming) {
    await stopAlarmSound();
    await getAlarmScheduler().forceDismissFiring();
  }
  await resetAlarm(oldSnapshot);
}

async function activateAlarmForNotification(
  snapshot: AlarmSnapshot,
  router: ReturnType<typeof useRouter>,
  shouldPlaySound: boolean,
  shouldClearDelivered: boolean,
): Promise<void> {
  if (activeActivationId === snapshot.alarmId) return;
  activeActivationId = snapshot.alarmId;
  try {
    await dismissOldAlarmIfActive(snapshot);
    useAlarmFiringStore.getState().setActive(snapshot);
    if (shouldPlaySound) {
      await playAlarmSound(soundUriFromSnapshot(snapshot));
    }
    navigateToAlarm(router, snapshot);
    if (shouldClearDelivered) {
      void clearDeliveredAlarmNotifications();
    }
  } finally {
    activeActivationId = null;
  }
}

export function useAlarmNotifications() {
  const router = useRouter();

  useEffect(() => {
    void initAlarmNotifications();

    const firedSub = getAlarmScheduler().addListener(
      "onAlarmFired",
      (snapshot) => {
        void activateAlarmForNotification(snapshot, router, false, false);
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
        void activateAlarmForNotification(snapshot, router, true, false);
      },
    );

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const snapshot = snapshotFromNotificationData(
          response.notification.request.content.data as
            Record<string, unknown> | undefined,
        );
        if (!snapshot) return;
        void activateAlarmForNotification(snapshot, router, true, true);
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
