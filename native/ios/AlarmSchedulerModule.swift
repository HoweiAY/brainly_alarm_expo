import AVFoundation
import ExpoModulesCore
import UserNotifications

// iOS has no exact-alarm API. Alarms are delivered as local notifications
// (`UNCalendarNotificationTrigger` for weekly recurrence, `UNTimeIntervalNotificationTrigger`
// for one-shot/snooze). The OS decides delivery time and may delay/defocus notifications;
// background wake-up and over-DND playback are not available. Sound is played via `AVAudioPlayer`
// on the `.alarm` audio session category only while the app is in the foreground. This is the
// documented degraded UX shared with Android through one JS API.
public final class AlarmSchedulerModule: Module {
  private static let deepLinkScheme = "brainlyalarmexpo"
  private static let deepLinkHost = "alarm"

  private var player: AVAudioPlayer?
  private var playerSnapshot: AlarmSnapshotRecord?

  public func definition() -> ModuleDefinition {
    Name("AlarmScheduler")

    Events("onAlarmFired", "onAlarmDismissed")

    AsyncFunction("scheduleWeekly") { (opts: ScheduleWeeklyOptsRecord) -> String in
      let snapshot = opts.payload
      let components = DateComponents()
      components.weekday = Self.iosWeekday(fromJsWeekday: opts.weekday)
      components.hour = opts.hour
      components.minute = opts.minute
      let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
      try Self.addRequest(identifier: opts.identifier, trigger: trigger, snapshot: snapshot)
      return opts.identifier
    }

    AsyncFunction("scheduleOneShot") { (opts: ScheduleOneShotOptsRecord) -> String in
      let now = Date().timeIntervalSince1970 * 1000.0
      let interval = max(1.0, (opts.triggerAt - now) / 1000.0)
      let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
      try Self.addRequest(identifier: opts.identifier, trigger: trigger, snapshot: opts.payload)
      return opts.identifier
    }

    AsyncFunction("cancel") { (identifier: String) in
      UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
    }

    AsyncFunction("cancelAllForAlarm") { (alarmId: String) in
      let identifiers = (0...6).map { "\(alarmId):\($0)" } + ["\(alarmId):snooze"]
      UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: identifiers)
    }

    AsyncFunction("requestExactAlarmPermission") { () -> Bool in
      try await Self.ensureNotificationAuthorization()
      return true
    }

    AsyncFunction("playAlarmSound") { (soundUri: String?) in
      try self.startPlayback(soundUri: soundUri, snapshot: nil)
    }

    AsyncFunction("stopAlarmSound") {
      self.stopPlayback()
    }

    AsyncFunction("forceDismissFiring") {
      let snapshot = self.playerSnapshot
      self.stopPlayback()
      if let snapshot {
        self.sendEvent("onAlarmDismissed", Self.eventPayload(from: snapshot))
      }
    }

    OnDestroy {
      self.stopPlayback()
    }
  }

  // JS weekday is Mon=0..Sun=6; `Calendar.weekday` is Sun=1..Sat=7.
  private static func iosWeekday(fromJsWeekday index: Int) -> Int {
    switch index {
    case 0: return 2
    case 1: return 3
    case 2: return 4
    case 3: return 5
    case 4: return 6
    case 5: return 7
    case 6: return 1
    default: return 2
    }
  }

  private static func ensureNotificationAuthorization() async throws {
    let center = UNUserNotificationCenter.current()
    let granted = try await center.notificationSettings()
    if granted.authorizationStatus != .authorized && granted.authorizationStatus != .provisional {
      try await center.requestAuthorization(options: [.alert, .sound, .badge])
    }
  }

  private static func addRequest(
    identifier: String,
    trigger: UNNotificationTrigger,
    snapshot: AlarmSnapshotRecord
  ) throws {
    let content = UNMutableNotificationContent()
    content.title = "Alarm"
    content.body = "\(snapshot.hour):\(String(format: "%02d", snapshot.minute))"
    content.sound = .default
    content.userInfo = Self.eventPayload(from: snapshot)
    let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
    try UNUserNotificationCenter.current().add(request)
  }

  private func startPlayback(soundUri: String?, snapshot: AlarmSnapshotRecord?) throws {
    stopPlayback()
    guard let soundUri, let url = URL(string: soundUri), FileManager.default.fileExists(atPath: url.path) else {
      // No custom sound: rely on the notification's `.default` sound.
      if let snapshot {
        playerSnapshot = snapshot
      }
      return
    }
    try AVAudioSession.sharedInstance().setCategory(.alarm, mode: .default, options: [])
    try AVAudioSession.sharedInstance().setActive(true)
    player = try AVAudioPlayer(contentsOf: url)
    player?.numberOfLoops = -1
    player?.prepareToPlay()
    player?.play()
    if let snapshot {
      playerSnapshot = snapshot
    }
  }

  private func stopPlayback() {
    player?.stop()
    player = nil
    playerSnapshot = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
  }

  private static func eventPayload(from snapshot: AlarmSnapshotRecord) -> [String: Any] {
    return [
      "alarmId": snapshot.alarmId,
      "weekday": snapshot.weekday,
      "hour": snapshot.hour,
      "minute": snapshot.minute,
      "task": snapshot.task,
      "roundCount": snapshot.roundCount,
      "difficulty": snapshot.difficulty,
      "sound": snapshot.sound,
      "snooze": snapshot.snooze,
      "enabled": snapshot.enabled,
      "isSnoozed": snapshot.isSnoozed,
    ]
  }
}

struct AlarmSnapshotRecord: Record {
  @Field var alarmId: String = ""
  @Field var weekday: Int = 0
  @Field var hour: Int = 0
  @Field var minute: Int = 0
  @Field var task: String = "Memory"
  @Field var roundCount: Int = 1
  @Field var difficulty: String = "Easy"
  @Field var sound: String = "Default"
  @Field var snooze: Bool = false
  @Field var enabled: Bool = false
  @Field var isSnoozed: Bool = false
}

struct ScheduleWeeklyOptsRecord: Record {
  @Field var identifier: String = ""
  @Field var alarmId: String = ""
  @Field var weekday: Int = 0
  @Field var hour: Int = 0
  @Field var minute: Int = 0
  @Field var soundUri: String?
  @Field var payload: AlarmSnapshotRecord = AlarmSnapshotRecord()
}

struct ScheduleOneShotOptsRecord: Record {
  @Field var identifier: String = ""
  @Field var alarmId: String = ""
  @Field var triggerAt: Double = 0
  @Field var soundUri: String?
  @Field var payload: AlarmSnapshotRecord = AlarmSnapshotRecord()
}
