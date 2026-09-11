import { i18n } from "@/i18n";

const DEFAULT_ALARM_NOTIFICATION_TITLE = "Time to wake up!";
const DEFAULT_ALARM_NOTIFICATION_BODY = "Click to disable the alarm.";
const DEFAULT_ALARM_NOTIFICATION_CHANNEL_NAME = "Alarms";

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
