package expo.modules.alarmscheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action
    if (action != Intent.ACTION_BOOT_COMPLETED &&
      action != "android.intent.action.QUICKBOOT_POWERON" &&
      action != "com.htc.intent.action.QUICKBOOT_POWERON"
    ) {
      return
    }
    Log.i("BootReceiver", "Boot completed; re-arming enabled alarms")
    runCatching {
      val store = AlarmStore(context)
      val alarms = store.use { it.getEnabledAlarms() }
      val now = System.currentTimeMillis()
      for (alarm in alarms) {
        val weekdays = if (alarm.days.isEmpty()) (0..6).toList() else alarm.days
        for (weekday in weekdays) {
          val identifier = "${alarm.id}:$weekday"
          val snapshot = AlarmSnapshotData(
            identifier = identifier,
            alarmId = alarm.id,
            weekday = weekday,
            hour = alarm.hour,
            minute = alarm.minute,
            task = alarm.task,
            roundCount = alarm.rounds,
            difficulty = alarm.difficulty,
            sound = alarm.sound ?: "Default",
            soundUri = alarm.sound,
            snooze = alarm.snooze,
            enabled = alarm.enabled,
            isSnoozed = false,
          )
          val triggerAt = nextWeeklyTrigger(weekday, alarm.hour, alarm.minute, now)
          scheduleAlarmAt(context, snapshot, triggerAt)
        }
      }
    }.onFailure { Log.e("BootReceiver", "Re-arming alarms failed", it) }
  }
}
