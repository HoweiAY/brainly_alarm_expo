import {
  parseAlarmSnapshot,
  reconcileSchedules,
  snapshotToQueryParams,
} from "@/alarms/scheduling";
import { alarmToSnapshot } from "@/data/conversions";
import type { Alarm, AlarmSnapshot } from "@/data/types";
import { i18n } from "@/i18n";
import {
  ALARM_CHANNEL_ID,
  syncAlarmNotificationChannel,
} from "@/notifications/AlarmNotifications";
import { getAlarmNotificationCopy } from "@/notifications/alarmNotificationCopy";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

let mockChannelCalls: [string, Record<string, unknown>][] = [];
let mockNative: unknown;
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
  AndroidImportance: { MAX: "max" },
  AndroidNotificationPriority: { MAX: "max" },
  AndroidNotificationVisibility: { PUBLIC: "public" },
  dismissAllNotificationsAsync: async () => {},
  requestPermissionsAsync: async () => ({ status: "granted" }),
  setNotificationChannelAsync: async (
    id: string,
    options: Record<string, unknown>,
  ) => {
    mockChannelCalls.push([id, options]);
    return null;
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
  mockChannelCalls = [];
  mockNative = undefined;
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

  it("synchronizes the Android channel with the active locale", async () => {
    await i18n.changeLanguage("zh-Hant");

    expect(getAlarmNotificationCopy().channelName).toBe("鬧鐘");
    await syncAlarmNotificationChannel();

    expect(mockChannelCalls).toContainEqual([
      ALARM_CHANNEL_ID,
      expect.objectContaining({ name: "鬧鐘" }),
    ]);
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
