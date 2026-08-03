package expo.modules.alarmscheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import java.util.Calendar

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_ALARM_FIRE) return
    val snapshot = readSnapshot(intent)
    if (!staleGuardPasses(snapshot)) {
      Log.i("AlarmReceiver", "Stale alarm ${snapshot.identifier} skipped")
      return
    }
    AlarmSoundService.start(context, soundUri = snapshot.soundUri, snapshot = snapshot)
    runCatching {
      val deepLink = snapshotToDeepLink(snapshot)
      context.startActivity(
        Intent(Intent.ACTION_VIEW, deepLink).addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP,
        ),
      )
    }.onFailure { Log.w("AlarmReceiver", "Could not launch deep link", it) }
    AlarmSchedulerModule.instance?.emitAlarmFired(snapshot)
  }

  // Stale-alarm guard (docs/03): fire only when today matches the scheduled
  // weekday and time, or when the alarm is a snooze one-shot.
  private fun staleGuardPasses(snapshot: AlarmSnapshotData): Boolean {
    if (snapshot.isSnoozed) return true
    val now = Calendar.getInstance()
    return now.get(Calendar.DAY_OF_WEEK) == weekdayIndexToCalendarDay(snapshot.weekday) &&
      now.get(Calendar.HOUR_OF_DAY) == snapshot.hour &&
      now.get(Calendar.MINUTE) == snapshot.minute
  }
}
