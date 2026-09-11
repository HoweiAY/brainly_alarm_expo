import { getAlarmNotificationCopy } from "@/notifications/alarmNotificationCopy";
import * as Notifications from "expo-notifications";
import {
  AndroidImportance,
  AndroidNotificationPriority,
  AndroidNotificationVisibility,
} from "expo-notifications";
import { Platform } from "react-native";

export const ALARM_CHANNEL_ID = "brainly_alarm_id";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    priority: AndroidNotificationPriority.MAX,
  }),
});

export async function syncAlarmNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const { channelName } = getAlarmNotificationCopy();
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: channelName,
      importance: AndroidImportance.MAX,
      bypassDnd: true,
      enableVibrate: true,
      showBadge: false,
      sound: null,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
  } catch {
    // Channel creation is Android-only; ignore on platforms without the API.
  }
}

export async function initAlarmNotifications(): Promise<void> {
  try {
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  } catch {
    // Permissions API may be unavailable on some environments (e.g. web / Expo Go
    // limited); failure here is non-fatal — the native scheduler still fires.
  }

  await syncAlarmNotificationChannel();
}

export async function clearDeliveredAlarmNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // No-op when the dismiss API is unavailable.
  }
}
