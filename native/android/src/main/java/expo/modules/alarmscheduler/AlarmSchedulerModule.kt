package expo.modules.alarmscheduler

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
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
  val notificationTitle: String = ENGLISH_ALARM_NOTIFICATION_COPY.title

  @Field
  val notificationBody: String = ENGLISH_ALARM_NOTIFICATION_COPY.body

  fun toData(identifier: String): AlarmSnapshotData =
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
      soundUri = sound.takeUnless { it == "Default" },
      snooze = snooze,
      enabled = enabled,
      isSnoozed = isSnoozed,
      notificationTitle = notificationTitle,
      notificationBody = notificationBody,
    )
}

class ScheduleWeeklyOptsRecord : Record {
  @Field
  val identifier: String = ""

  @Field
  val weekday: Int = 0

  @Field
  val hour: Int = 0

  @Field
  val minute: Int = 0

  @Field
  val payload: AlarmSnapshotRecord = AlarmSnapshotRecord()
}

class ScheduleOneShotOptsRecord : Record {
  @Field
  val identifier: String = ""

  @Field
  val triggerAt: Double = 0.0

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

    Events("onAlarmFired")

    OnCreate {
      instance = this@AlarmSchedulerModule
    }

    OnDestroy {
      if (instance === this@AlarmSchedulerModule) instance = null
    }

    AsyncFunction("scheduleWeekly") { opts: ScheduleWeeklyOptsRecord ->
      val snapshot = opts.payload.toData(opts.identifier)
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
      val snapshot = opts.payload.toData(opts.identifier)
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
  }

  fun emitAlarmFired(snapshot: AlarmSnapshotData) {
    sendEvent("onAlarmFired", snapshot.toBundle())
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
