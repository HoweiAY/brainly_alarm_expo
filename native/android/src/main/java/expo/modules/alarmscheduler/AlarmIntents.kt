package expo.modules.alarmscheduler

import android.content.Intent
import android.net.Uri
import java.util.Calendar
import java.util.Locale

const val ACTION_ALARM_FIRE = "expo.modules.alarmscheduler.ALARM_FIRE"
const val ALARM_CHANNEL_ID = "brainly_alarm_id"
const val DEEP_LINK_SCHEME = "brainlyalarmexpo"
const val DEEP_LINK_HOST = "alarm"

object AlarmIntents {
  const val EXTRA_IDENTIFIER = "identifier"
  const val EXTRA_ALARM_ID = "alarmId"
  const val EXTRA_WEEKDAY = "weekday"
  const val EXTRA_HOUR = "hour"
  const val EXTRA_MINUTE = "minute"
  const val EXTRA_TASK = "task"
  const val EXTRA_ROUND_COUNT = "roundCount"
  const val EXTRA_DIFFICULTY = "difficulty"
  const val EXTRA_SOUND = "sound"
  const val EXTRA_SOUND_URI = "soundUri"
  const val EXTRA_SNOOZE = "snooze"
  const val EXTRA_ENABLED = "enabled"
  const val EXTRA_IS_SNOOZED = "isSnoozed"
  const val EXTRA_NOTIFICATION_TITLE = "notificationTitle"
  const val EXTRA_NOTIFICATION_BODY = "notificationBody"
}

data class AlarmSnapshotData(
  val identifier: String,
  val alarmId: String,
  val weekday: Int,
  val hour: Int,
  val minute: Int,
  val task: String,
  val roundCount: Int,
  val difficulty: String,
  val sound: String,
  val soundUri: String?,
  val snooze: Boolean,
  val enabled: Boolean,
  val isSnoozed: Boolean,
  val notificationTitle: String,
  val notificationBody: String,
)

// JS sends weekday as Mon=0..Sun=6 (src/data/constants weekdayToIndex).
// Calendar.DAY_OF_WEEK uses Sun=1..Sat=7.
fun weekdayIndexToCalendarDay(weekdayIndex: Int): Int = when (weekdayIndex) {
  0 -> Calendar.MONDAY
  1 -> Calendar.TUESDAY
  2 -> Calendar.WEDNESDAY
  3 -> Calendar.THURSDAY
  4 -> Calendar.FRIDAY
  5 -> Calendar.SATURDAY
  6 -> Calendar.SUNDAY
  else -> Calendar.MONDAY
}

// Mirrors the JS nextWeeklyTriggerTime: this week's weekday at HH:MM:00,
// advanced +7 days if it has already passed.
fun nextWeeklyTrigger(weekdayIndex: Int, hour: Int, minute: Int, now: Long): Long {
  val calendar = Calendar.getInstance().apply {
    timeInMillis = now
    set(Calendar.MILLISECOND, 0)
    set(Calendar.SECOND, 0)
    set(Calendar.MINUTE, minute)
    set(Calendar.HOUR_OF_DAY, hour)
    set(Calendar.DAY_OF_WEEK, weekdayIndexToCalendarDay(weekdayIndex))
  }
  if (calendar.timeInMillis <= now) {
    calendar.add(Calendar.DAY_OF_MONTH, 7)
  }
  return calendar.timeInMillis
}

fun putSnapshot(intent: Intent, snapshot: AlarmSnapshotData) {
  intent.apply {
    putExtra(AlarmIntents.EXTRA_IDENTIFIER, snapshot.identifier)
    putExtra(AlarmIntents.EXTRA_ALARM_ID, snapshot.alarmId)
    putExtra(AlarmIntents.EXTRA_WEEKDAY, snapshot.weekday)
    putExtra(AlarmIntents.EXTRA_HOUR, snapshot.hour)
    putExtra(AlarmIntents.EXTRA_MINUTE, snapshot.minute)
    putExtra(AlarmIntents.EXTRA_TASK, snapshot.task)
    putExtra(AlarmIntents.EXTRA_ROUND_COUNT, snapshot.roundCount)
    putExtra(AlarmIntents.EXTRA_DIFFICULTY, snapshot.difficulty)
    putExtra(AlarmIntents.EXTRA_SOUND, snapshot.sound)
    putExtra(AlarmIntents.EXTRA_SOUND_URI, snapshot.soundUri)
    putExtra(AlarmIntents.EXTRA_SNOOZE, snapshot.snooze)
    putExtra(AlarmIntents.EXTRA_ENABLED, snapshot.enabled)
    putExtra(AlarmIntents.EXTRA_IS_SNOOZED, snapshot.isSnoozed)
    putExtra(AlarmIntents.EXTRA_NOTIFICATION_TITLE, snapshot.notificationTitle)
    putExtra(AlarmIntents.EXTRA_NOTIFICATION_BODY, snapshot.notificationBody)
  }
}

fun readSnapshot(intent: Intent): AlarmSnapshotData {
  return AlarmSnapshotData(
    identifier = intent.getStringExtra(AlarmIntents.EXTRA_IDENTIFIER) ?: "",
    alarmId = intent.getStringExtra(AlarmIntents.EXTRA_ALARM_ID) ?: "",
    weekday = intent.getIntExtra(AlarmIntents.EXTRA_WEEKDAY, 0),
    hour = intent.getIntExtra(AlarmIntents.EXTRA_HOUR, 0),
    minute = intent.getIntExtra(AlarmIntents.EXTRA_MINUTE, 0),
    task = intent.getStringExtra(AlarmIntents.EXTRA_TASK) ?: "Memory",
    roundCount = intent.getIntExtra(AlarmIntents.EXTRA_ROUND_COUNT, 1),
    difficulty = intent.getStringExtra(AlarmIntents.EXTRA_DIFFICULTY) ?: "Easy",
    sound = intent.getStringExtra(AlarmIntents.EXTRA_SOUND) ?: "Default",
    soundUri = intent.getStringExtra(AlarmIntents.EXTRA_SOUND_URI),
    snooze = intent.getBooleanExtra(AlarmIntents.EXTRA_SNOOZE, false),
    enabled = intent.getBooleanExtra(AlarmIntents.EXTRA_ENABLED, false),
    isSnoozed = intent.getBooleanExtra(AlarmIntents.EXTRA_IS_SNOOZED, false),
    notificationTitle = intent.getStringExtra(AlarmIntents.EXTRA_NOTIFICATION_TITLE) ?: "Time to wake up!",
    notificationBody = intent.getStringExtra(AlarmIntents.EXTRA_NOTIFICATION_BODY) ?: "Click to disable the alarm.",
  )
}

fun snapshotToDeepLink(snapshot: AlarmSnapshotData): Uri {
  val params = mapOf(
    "alarmId" to snapshot.alarmId,
    "weekday" to snapshot.weekday.toString(),
    "hour" to snapshot.hour.toString(),
    "minute" to snapshot.minute.toString(),
    "task" to snapshot.task,
    "roundCount" to snapshot.roundCount.toString(),
    "difficulty" to snapshot.difficulty,
    "sound" to snapshot.sound,
    "snooze" to snapshot.snooze.toString(),
    "enabled" to snapshot.enabled.toString(),
    "isSnoozed" to snapshot.isSnoozed.toString(),
    "notificationTitle" to snapshot.notificationTitle,
    "notificationBody" to snapshot.notificationBody,
  )
  val query = params.entries.joinToString("&") { (k, v) ->
    "${Uri.encode(k)}=${Uri.encode(v)}"
  }
  return Uri.parse("$DEEP_LINK_SCHEME://$DEEP_LINK_HOST?$query")
}

fun weekdayName(index: Int): String = when (index) {
  0 -> "Mon"
  1 -> "Tue"
  2 -> "Wed"
  3 -> "Thu"
  4 -> "Fri"
  5 -> "Sat"
  6 -> "Sun"
  else -> ""
}

fun formatTimeLabel(hour: Int, minute: Int): String =
  String.format(Locale.US, "%02d:%02d", hour, minute)
