import {
  parseAlarmSnapshot,
  reconcileSchedules,
  snapshotToQueryParams,
} from "@/alarms/scheduling";
import { alarmToSnapshot } from "@/data/conversions";
import type { Alarm, AlarmSnapshot } from "@/data/types";
import { i18n } from "@/i18n";
import {
  initAlarmNotifications,
  syncAlarmNotificationChannel,
} from "@/notifications/AlarmNotifications";
import { getAlarmNotificationCopy } from "@/notifications/alarmNotificationCopy";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

let mockNative: unknown;
let mockSyncNotificationChannel: ReturnType<typeof jest.fn>;
let mockNotificationLifecycle: string[] = [];
let mockPermissionGranted = true;
let mockIosPermissionStatus = "authorized";
let mockPermissionError = false;
let mockAlarmFiringStoreState: unknown;
let mockAlarmRegistrationsStoreState: unknown;
let mockAlarmStoreState: unknown;
let mockSettingsStoreState: unknown;

jest.mock("expo-localization", () => ({
  getLocales: () => [
    {
      languageCode: "en",
      languageTag: "en-US",
      languageScriptCode: null,
      regionCode: "US",
    },
  ],
}));

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

jest.mock("expo-notifications", () => ({
  AndroidNotificationPriority: { MAX: "max" },
  IosAuthorizationStatus: { PROVISIONAL: "provisional" },
  dismissAllNotificationsAsync: async () => {},
  getPermissionsAsync: async () => {
    mockNotificationLifecycle.push("permissions");
    if (mockPermissionError) throw new Error("permissions unavailable");
    return {
      granted: mockPermissionGranted,
      ios: { status: mockIosPermissionStatus },
    };
  },
  requestPermissionsAsync: async () => {
    mockNotificationLifecycle.push("request");
    return { status: "granted" };
  },
  setNotificationHandler: () => {},
}));

jest.mock("@/alarms/AlarmScheduler", () => ({
  getAlarmScheduler: () => mockNative,
}));

jest.mock("@/store/alarmFiringStore", () => ({
  useAlarmFiringStore: { getState: () => mockAlarmFiringStoreState },
}));

jest.mock("@/store/alarmRegistrationsStore", () => ({
  useAlarmRegistrationsStore: {
    getState: () => mockAlarmRegistrationsStoreState,
  },
}));

jest.mock("@/store/alarmStore", () => ({
  useAlarmStore: { getState: () => mockAlarmStoreState },
}));

jest.mock("@/store/settingsStore", () => ({
  useSettingsStore: { getState: () => mockSettingsStoreState },
}));

const alarm: Alarm = {
  id: "alarm-1",
  days: ["Mon"],
  hour: 8,
  minute: 30,
  task: "Memory",
  rounds: 2,
  difficulty: "Normal",
  sound: null,
  snooze: true,
  enabled: true,
};

beforeEach(async () => {
  mockNotificationLifecycle = [];
  mockPermissionGranted = true;
  mockIosPermissionStatus = "authorized";
  mockPermissionError = false;
  mockSyncNotificationChannel = jest.fn(async (_channelName: string) => {
    mockNotificationLifecycle.push("channel");
  });
  mockNative = { syncNotificationChannel: mockSyncNotificationChannel };
  mockAlarmFiringStoreState = undefined;
  mockAlarmRegistrationsStoreState = undefined;
  mockAlarmStoreState = undefined;
  mockSettingsStoreState = undefined;
  await i18n.changeLanguage("en");
});

describe("localized alarm notification copy", () => {
  it("uses the active locale for new snapshots", async () => {
    expect(alarmToSnapshot(alarm, 0).notificationTitle).toBe(
      "Time to wake up!",
    );

    await i18n.changeLanguage("zh-Hant");

    const snapshot = alarmToSnapshot(alarm, 0);
    expect(snapshot.notificationTitle).toBe("起床時間到了！");
    expect(snapshot.notificationBody).toBe("輕觸以關閉鬧鐘。");
  });

  it("uses the active locale for parser and query fallbacks", async () => {
    await i18n.changeLanguage("zh-Hant");

    const parsed = parseAlarmSnapshot({ alarmId: "alarm-1" });
    expect(parsed?.notificationTitle).toBe("起床時間到了！");
    expect(parsed?.notificationBody).toBe("輕觸以關閉鬧鐘。");

    const snapshot = {
      ...alarmToSnapshot(alarm, 0),
      notificationTitle: undefined,
      notificationBody: undefined,
    } as unknown as AlarmSnapshot;
    const params = snapshotToQueryParams(snapshot);
    expect(params.notificationTitle).toBe("起床時間到了！");
    expect(params.notificationBody).toBe("輕觸以關閉鬧鐘。");
  });

  it("delegates localized channel synchronization to native", async () => {
    await i18n.changeLanguage("zh-Hant");

    expect(getAlarmNotificationCopy().channelName).toBe("鬧鐘");
    await syncAlarmNotificationChannel();

    expect(mockSyncNotificationChannel).toHaveBeenCalledWith("鬧鐘");
  });
});

describe("notification initialization", () => {
  it("synchronizes the channel before requesting permission", async () => {
    mockPermissionGranted = false;
    mockIosPermissionStatus = "denied";

    await initAlarmNotifications();

    expect(mockNotificationLifecycle).toEqual([
      "channel",
      "permissions",
      "request",
    ]);
  });

  it("does not request permission when already granted or provisional", async () => {
    await initAlarmNotifications();
    expect(mockNotificationLifecycle).toEqual(["channel", "permissions"]);

    mockNotificationLifecycle = [];
    mockPermissionGranted = false;
    mockIosPermissionStatus = "provisional";
    await initAlarmNotifications();

    expect(mockNotificationLifecycle).toEqual(["channel", "permissions"]);
  });

  it("treats permission API failures as non-fatal", async () => {
    mockPermissionError = true;

    await expect(initAlarmNotifications()).resolves.toBeUndefined();
    expect(mockNotificationLifecycle).toEqual(["channel", "permissions"]);
  });
});

describe("localized weekly reconciliation", () => {
  it("refreshes weekly payloads without canceling a pending snooze", async () => {
    const native = {
      scheduleWeekly: jest.fn(
        async ({ identifier }: { identifier: string }) => identifier,
      ),
      scheduleOneShot: jest.fn(
        async ({ identifier }: { identifier: string }) => identifier,
      ),
      cancel: jest.fn(async (_identifier: string) => {}),
      cancelAllForAlarm: jest.fn(async (_alarmId: string) => {}),
      requestExactAlarmPermission: jest.fn(async () => true),
      syncNotificationChannel: jest.fn(async (_channelName: string) => {}),
      playAlarmSound: jest.fn(async () => {}),
      stopAlarmSound: jest.fn(async () => {}),
      addListener: jest.fn(() => ({ remove() {} })),
    };
    const registry = {
      getAll: jest.fn(() => [
        { alarmId: alarm.id, type: "snooze", generation: 0 },
      ]),
      removeForAlarm: jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
      upsert: jest.fn(async () => {}),
    };
    mockNative = native;
    mockAlarmStoreState = { alarms: [alarm] };
    mockAlarmRegistrationsStoreState = registry;
    await i18n.changeLanguage("zh-Hant");

    await reconcileSchedules();

    expect(native.cancel).toHaveBeenCalledWith("alarm-1:0");
    expect(native.cancel).not.toHaveBeenCalledWith("alarm-1:snooze");
    expect(native.cancelAllForAlarm).not.toHaveBeenCalled();
    expect(native.scheduleWeekly).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          notificationTitle: "起床時間到了！",
          notificationBody: "輕觸以關閉鬧鐘。",
        }),
      }),
    );
  });

  it("propagates weekly scheduling failures", async () => {
    const failure = new Error("schedule failed");
    mockNative = {
      scheduleWeekly: jest.fn(async () => {
        throw failure;
      }),
      cancel: jest.fn(async () => {}),
    };
    mockAlarmStoreState = { alarms: [alarm] };
    mockAlarmRegistrationsStoreState = { getAll: jest.fn(() => []) };

    await expect(reconcileSchedules()).rejects.toBe(failure);
  });
});
