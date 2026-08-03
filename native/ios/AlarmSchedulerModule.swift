import ExpoModulesCore

public class AlarmSchedulerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AlarmScheduler")

    AsyncFunction("scheduleWeekly") { () -> String in
      throw Exception(name: "E_NOT_IMPLEMENTED", description: "AlarmScheduler.scheduleWeekly is not implemented yet")
    }
    AsyncFunction("scheduleOneShot") { () -> String in
      throw Exception(name: "E_NOT_IMPLEMENTED", description: "AlarmScheduler.scheduleOneShot is not implemented yet")
    }
    AsyncFunction("cancel") { () -> Void in
      throw Exception(name: "E_NOT_IMPLEMENTED", description: "AlarmScheduler.cancel is not implemented yet")
    }
    AsyncFunction("cancelAllForAlarm") { () -> Void in
      throw Exception(name: "E_NOT_IMPLEMENTED", description: "AlarmScheduler.cancelAllForAlarm is not implemented yet")
    }
    AsyncFunction("requestExactAlarmPermission") { () -> Bool in
      throw Exception(name: "E_NOT_IMPLEMENTED", description: "AlarmScheduler.requestExactAlarmPermission is not implemented yet")
    }
    AsyncFunction("playAlarmSound") { () -> Void in
      throw Exception(name: "E_NOT_IMPLEMENTED", description: "AlarmScheduler.playAlarmSound is not implemented yet")
    }
    AsyncFunction("stopAlarmSound") { () -> Void in
      throw Exception(name: "E_NOT_IMPLEMENTED", description: "AlarmScheduler.stopAlarmSound is not implemented yet")
    }
    AsyncFunction("forceDismissFiring") { () -> Void in
      throw Exception(name: "E_NOT_IMPLEMENTED", description: "AlarmScheduler.forceDismissFiring is not implemented yet")
    }
  }
}
