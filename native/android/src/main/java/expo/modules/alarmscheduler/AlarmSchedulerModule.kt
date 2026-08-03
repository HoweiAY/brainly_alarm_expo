package expo.modules.alarmscheduler

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AlarmSchedulerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AlarmScheduler")

    Events("onAlarmFired", "onAlarmDismissed")

    AsyncFunction("scheduleWeekly") {
      throw Exception("AlarmScheduler.scheduleWeekly is not implemented yet")
    }
    AsyncFunction("scheduleOneShot") {
      throw Exception("AlarmScheduler.scheduleOneShot is not implemented yet")
    }
    AsyncFunction("cancel") {
      throw Exception("AlarmScheduler.cancel is not implemented yet")
    }
    AsyncFunction("cancelAllForAlarm") {
      throw Exception("AlarmScheduler.cancelAllForAlarm is not implemented yet")
    }
    AsyncFunction("requestExactAlarmPermission") {
      throw Exception("AlarmScheduler.requestExactAlarmPermission is not implemented yet")
    }
    AsyncFunction("playAlarmSound") {
      throw Exception("AlarmScheduler.playAlarmSound is not implemented yet")
    }
    AsyncFunction("stopAlarmSound") {
      throw Exception("AlarmScheduler.stopAlarmSound is not implemented yet")
    }
    AsyncFunction("forceDismissFiring") {
      throw Exception("AlarmScheduler.forceDismissFiring is not implemented yet")
    }
  }
}
