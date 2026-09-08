package expo.modules.alarmscheduler

data class AlarmNotificationCopy(
  val title: String,
  val body: String,
  val channelName: String,
)

val ENGLISH_ALARM_NOTIFICATION_COPY = AlarmNotificationCopy(
  title = "Time to wake up!",
  body = "Click to disable the alarm.",
  channelName = "Alarms",
)

private val TRADITIONAL_CHINESE_ALARM_NOTIFICATION_COPY = AlarmNotificationCopy(
  title = "起床時間到了！",
  body = "輕觸以關閉鬧鐘。",
  channelName = "鬧鐘",
)

fun alarmNotificationCopy(language: String?): AlarmNotificationCopy =
  if (language == "zh-Hant") {
    TRADITIONAL_CHINESE_ALARM_NOTIFICATION_COPY
  } else {
    ENGLISH_ALARM_NOTIFICATION_COPY
  }
