import { getAlarmScheduler } from "@/alarms/AlarmScheduler";
import { getAlarmNotificationCopy } from "@/notifications/alarmNotificationCopy";
import * as Notifications from "expo-notifications";
import { AndroidNotificationPriority } from "expo-notifications";

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
  try {
    const { channelName } = getAlarmNotificationCopy();
    await getAlarmScheduler().syncNotificationChannel(channelName);
  } catch {
    // Channel creation is Android-only; ignore on platforms without the API.
  }
}

export async function initAlarmNotifications(): Promise<void> {
  await syncAlarmNotificationChannel();

  try {
    const permissions = await Notifications.getPermissionsAsync();
    const isProvisional =
      permissions.ios?.status ===
      Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!permissions.granted && !isProvisional) {
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
    }
  } catch {
    // Permissions API may be unavailable on some environments (e.g. web / Expo Go
    // limited); failure here is non-fatal — the native scheduler still fires.
  }
}

export async function clearDeliveredAlarmNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // No-op when the dismiss API is unavailable.
  }
}
