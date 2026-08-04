import { parseAlarmSnapshot, snapshotToQueryParams } from "@/alarms/scheduling";
import { getAlarmScheduler } from "@/alarms/AlarmScheduler";
import { playAlarmSound, soundUriFromSnapshot } from "@/alarms/sound";
import {
  clearDeliveredAlarmNotifications,
  initAlarmNotifications,
} from "@/notifications/AlarmNotifications";
import type { AlarmSnapshot } from "@/data/types";
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

export function useAlarmNotifications() {
  const router = useRouter();

  useEffect(() => {
    void initAlarmNotifications();

    const firedSub = getAlarmScheduler().addListener(
      "onAlarmFired",
      (snapshot) => {
        // The native side already starts sound playback and (on Android) launches
        // the alarm screen via the deep link. Use this event only as a fallback
        // navigation path when the app is already in the foreground.
        navigateToAlarm(router, snapshot);
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
        void playAlarmSound(soundUriFromSnapshot(snapshot));
        navigateToAlarm(router, snapshot);
      },
    );

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const snapshot = snapshotFromNotificationData(
          response.notification.request.content.data as
            Record<string, unknown> | undefined,
        );
        if (!snapshot) return;
        void playAlarmSound(soundUriFromSnapshot(snapshot));
        navigateToAlarm(router, snapshot);
        // Collapse to a single active alarm notification: dismiss any other
        // delivered notifications so a previously-fired alarm alert is replaced.
        void clearDeliveredAlarmNotifications();
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
