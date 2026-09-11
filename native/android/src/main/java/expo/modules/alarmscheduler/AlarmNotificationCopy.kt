package expo.modules.alarmscheduler

data class AlarmNotificationCopy(
  val title: String,
  val body: String,
  val channelName: String,
)

private const val DEFAULT_ALARM_NOTIFICATION_LANGUAGE = "en"

private val ALARM_NOTIFICATION_COPIES = hashMapOf(
  DEFAULT_ALARM_NOTIFICATION_LANGUAGE to AlarmNotificationCopy(
    title = "Time to wake up!",
    body = "Click to disable the alarm.",
    channelName = "Alarms",
  ),
  "zh-Hant" to AlarmNotificationCopy(
    title = "起床時間到了！",
    body = "輕觸以關閉鬧鐘。",
    channelName = "鬧鐘",
  ),
)

val ENGLISH_ALARM_NOTIFICATION_COPY =
  requireNotNull(ALARM_NOTIFICATION_COPIES[DEFAULT_ALARM_NOTIFICATION_LANGUAGE])

fun alarmNotificationCopy(language: String?): AlarmNotificationCopy =
  language?.let(ALARM_NOTIFICATION_COPIES::get) ?: ENGLISH_ALARM_NOTIFICATION_COPY
