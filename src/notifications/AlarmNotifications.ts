import { i18n } from "@/i18n";
import * as Notifications from "expo-notifications";
import {
  AndroidImportance,
  AndroidNotificationPriority,
  AndroidNotificationVisibility,
} from "expo-notifications";
import { Platform } from "react-native";

export const ALARM_CHANNEL_ID = "brainly_alarm_id";

export const DEFAULT_ALARM_NOTIFICATION_TITLE = "Time to wake up!";
export const DEFAULT_ALARM_NOTIFICATION_BODY = "Click to disable the alarm.";
export const DEFAULT_ALARM_NOTIFICATION_CHANNEL_NAME = "Alarms";

export interface AlarmNotificationCopy {
  title: string;
  body: string;
  channelName: string;
}

export function getAlarmNotificationCopy(): AlarmNotificationCopy {
  return {
    title: i18n.t("notifications.title", {
      defaultValue: DEFAULT_ALARM_NOTIFICATION_TITLE,
    }),
    body: i18n.t("notifications.body", {
      defaultValue: DEFAULT_ALARM_NOTIFICATION_BODY,
    }),
    channelName: i18n.t("notifications.channelName", {
      defaultValue: DEFAULT_ALARM_NOTIFICATION_CHANNEL_NAME,
    }),
  };
}

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
