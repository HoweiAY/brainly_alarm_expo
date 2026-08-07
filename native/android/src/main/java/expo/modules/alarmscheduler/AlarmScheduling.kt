package expo.modules.alarmscheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

private const val TAG = "AlarmScheduling"

fun buildFirePendingIntent(
  context: Context,
  snapshot: AlarmSnapshotData,
  create: Boolean,
): PendingIntent {
  val intent = Intent(context, AlarmReceiver::class.java).apply {
    action = ACTION_ALARM_FIRE
    putSnapshot(this, snapshot)
  }
  val flags = if (create) {
    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
  } else {
    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
  }
  return PendingIntent.getBroadcast(context, snapshot.identifier.hashCode(), intent, flags)
}

fun scheduleAlarmAt(context: Context, snapshot: AlarmSnapshotData, triggerAt: Long) {
  val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  val pendingIntent = buildFirePendingIntent(context, snapshot, create = true)
  try {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && am.canScheduleExactAlarms()) {
      am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
    } else {
      am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
    }
  } catch (security: SecurityException) {
    Log.w(TAG, "Exact alarm permission missing; falling back to inexact", security)
    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
  }
}

fun cancelIdentifier(context: Context, identifier: String) {
  val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  val intent = Intent(context, AlarmReceiver::class.java).apply { action = ACTION_ALARM_FIRE }
  val pendingIntent = PendingIntent.getBroadcast(
    context,
    identifier.hashCode(),
    intent,
    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE,
  )
  if (pendingIntent != null) {
    am.cancel(pendingIntent)
    pendingIntent.cancel()
  }
}

fun cancelAllForAlarm(context: Context, alarmId: String) {
  for (weekday in 0..6) {
    cancelIdentifier(context, "$alarmId:$weekday")
  }
  cancelIdentifier(context, "$alarmId:snooze")
}
