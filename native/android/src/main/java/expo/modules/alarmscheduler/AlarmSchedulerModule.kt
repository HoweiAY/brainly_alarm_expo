package expo.modules.alarmscheduler

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

const val ALARM_NOTIFICATION_ID = 4269

class AlarmSnapshotRecord : Record {
  @Field
  val alarmId: String = ""

  @Field
  val weekday: Int = 0

  @Field
  val hour: Int = 0

  @Field
  val minute: Int = 0

  @Field
  val task: String = "Memory"

  @Field
  val roundCount: Int = 1

  @Field
  val difficulty: String = "Easy"

  @Field
  val sound: String = "Default"

  @Field
  val snooze: Boolean = false

  @Field
  val enabled: Boolean = false

  @Field
  val isSnoozed: Boolean = false

  @Field
  val notificationTitle: String = "Time to wake up!"

  @Field
  val notificationBody: String = "Click to disable the alarm."

  fun toData(identifier: String, soundUri: String?): AlarmSnapshotData =
    AlarmSnapshotData(
      identifier = identifier,
      alarmId = alarmId,
      weekday = weekday,
      hour = hour,
      minute = minute,
      task = task,
      roundCount = roundCount,
      difficulty = difficulty,
      sound = sound,
      soundUri = soundUri,
      snooze = snooze,
      enabled = enabled,
      isSnoozed = isSnoozed,
      notificationTitle = notificationTitle,
      notificationBody = notificationBody,
    )

  fun toBundle(): android.os.Bundle = bundleOf(
    "alarmId" to alarmId,
    "weekday" to weekday,
    "hour" to hour,
    "minute" to minute,
    "task" to task,
    "roundCount" to roundCount,
    "difficulty" to difficulty,
    "sound" to sound,
    "snooze" to snooze,
    "enabled" to enabled,
    "isSnoozed" to isSnoozed,
    "notificationTitle" to notificationTitle,
    "notificationBody" to notificationBody,
  )
}

class ScheduleWeeklyOptsRecord : Record {
  @Field
  val identifier: String = ""

  @Field
  val alarmId: String = ""

  @Field
  val weekday: Int = 0

  @Field
  val hour: Int = 0

  @Field
  val minute: Int = 0

  @Field
  val soundUri: String? = null

  @Field
  val payload: AlarmSnapshotRecord = AlarmSnapshotRecord()
}

class ScheduleOneShotOptsRecord : Record {
  @Field
  val identifier: String = ""

  @Field
  val alarmId: String = ""

  @Field
  val triggerAt: Double = 0.0

  @Field
  val soundUri: String? = null

  @Field
  val payload: AlarmSnapshotRecord = AlarmSnapshotRecord()
}

class AlarmSchedulerModule : Module() {
  companion object {
    private const val TAG = "AlarmScheduler"
    @Volatile var instance: AlarmSchedulerModule? = null
  }

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private val alarmManager: AlarmManager
    get() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  override fun definition() = ModuleDefinition {
    Name("AlarmScheduler")

    Events("onAlarmFired", "onAlarmDismissed")

    OnCreate {
      instance = this@AlarmSchedulerModule
    }

    OnDestroy {
      if (instance === this@AlarmSchedulerModule) instance = null
    }

    AsyncFunction("scheduleWeekly") { opts: ScheduleWeeklyOptsRecord ->
      val snapshot = opts.payload.toData(opts.identifier, opts.soundUri)
      val triggerAt = nextWeeklyTrigger(
        opts.weekday,
        opts.hour,
        opts.minute,
        System.currentTimeMillis(),
      )
      scheduleAlarmAt(context, snapshot, triggerAt)
      return@AsyncFunction opts.identifier
    }

    AsyncFunction("scheduleOneShot") { opts: ScheduleOneShotOptsRecord ->
      val snapshot = opts.payload.toData(opts.identifier, opts.soundUri)
      val triggerAt = opts.triggerAt.toLong()
      scheduleAlarmAt(context, snapshot, triggerAt)
      return@AsyncFunction opts.identifier
    }

    AsyncFunction("cancel") { identifier: String ->
      cancelIdentifier(context, identifier)
    }

    AsyncFunction("cancelAllForAlarm") { alarmId: String ->
      cancelAllForAlarm(context, alarmId)
    }

    AsyncFunction("requestExactAlarmPermission") {
      return@AsyncFunction ensureExactAlarmPermission()
    }

    AsyncFunction("playAlarmSound") { soundUri: String? ->
      AlarmSoundService.start(context, soundUri = soundUri, snapshot = null)
    }

    AsyncFunction("stopAlarmSound") {
      AlarmSoundService.stop(context)
    }

    AsyncFunction("forceDismissFiring") {
      val snapshot = AlarmSoundService.currentSnapshot
      AlarmSoundService.stop(context)
      if (snapshot != null) {
        val payload = bundleOf(
          "alarmId" to snapshot.alarmId,
          "weekday" to snapshot.weekday,
          "hour" to snapshot.hour,
          "minute" to snapshot.minute,
          "task" to snapshot.task,
          "roundCount" to snapshot.roundCount,
          "difficulty" to snapshot.difficulty,
          "sound" to snapshot.sound,
          "snooze" to snapshot.snooze,
          "enabled" to snapshot.enabled,
          "isSnoozed" to snapshot.isSnoozed,
          "notificationTitle" to snapshot.notificationTitle,
          "notificationBody" to snapshot.notificationBody,
        )
        sendEvent("onAlarmDismissed", payload)
      }
    }
  }

  fun emitAlarmFired(snapshot: AlarmSnapshotData) {
    sendEvent(
      "onAlarmFired",
      bundleOf(
        "alarmId" to snapshot.alarmId,
        "weekday" to snapshot.weekday,
        "hour" to snapshot.hour,
        "minute" to snapshot.minute,
        "task" to snapshot.task,
        "roundCount" to snapshot.roundCount,
        "difficulty" to snapshot.difficulty,
        "sound" to snapshot.sound,
        "snooze" to snapshot.snooze,
        "enabled" to snapshot.enabled,
        "isSnoozed" to snapshot.isSnoozed,
        "notificationTitle" to snapshot.notificationTitle,
        "notificationBody" to snapshot.notificationBody,
      ),
    )
  }

  @Suppress("DEPRECATION")
  private fun ensureExactAlarmPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    if (alarmManager.canScheduleExactAlarms()) return true
    runCatching {
      val activity = appContext.currentActivity
      val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
        data = Uri.parse("package:" + context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      activity?.startActivity(intent) ?: context.startActivity(intent)
    }.onFailure { Log.w(TAG, "Could not request exact alarm permission", it) }
    return false
  }
}
