import type { Alarm } from "@/data/types";
import { en } from "@/i18n/locales/en";
import { zhHant } from "@/i18n/locales/zh-Hant";
import { computeNextAlarm, formatCountdown, getDaysString } from "@/utils/time";
import { beforeAll, describe, expect, it } from "@jest/globals";
import dayjs from "dayjs";
import { createInstance, type i18n } from "i18next";

let instance: i18n;

beforeAll(async () => {
  instance = createInstance();
  await instance.init({
    resources: {
      en: { translation: en },
      "zh-Hant": { translation: zhHant },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
});

function baseAlarm(over: Partial<Alarm> = {}): Alarm {
  return {
    id: "alarm-1",
    days: [],
    hour: 8,
    minute: 0,
    task: "Memory",
    rounds: 1,
    difficulty: "Easy",
    sound: null,
    snooze: true,
    enabled: true,
    ...over,
  };
}

describe("localized time formatters", () => {
  it("formats days in English", async () => {
    await instance.changeLanguage("en");
    expect(getDaysString([], instance.t)).toBe("Every day");
    expect(getDaysString(["Wed", "Mon"], instance.t)).toBe("Mon, Wed");
  });

  it("formats days in Traditional Chinese", async () => {
    await instance.changeLanguage("zh-Hant");
    expect(getDaysString([], instance.t)).toBe("每天");
    expect(getDaysString(["Wed", "Mon"], instance.t)).toBe("一, 三");
  });

  it("formats countdowns in English", async () => {
    await instance.changeLanguage("en");
    expect(formatCountdown(null, instance.t)).toBe("No alarms set");
    expect(formatCountdown({ days: 1, hours: 2, minutes: 3 }, instance.t)).toBe(
      "Next alarm in 1 day 2 hours 3 minutes",
    );
  });
  it("formats countdowns in Traditional Chinese", async () => {
    await instance.changeLanguage("zh-Hant");
    expect(formatCountdown(null, instance.t)).toBe("未設定鬧鐘");
    expect(formatCountdown({ days: 1, hours: 2, minutes: 3 }, instance.t)).toBe(
      "下一個鬧鐘將在 1 天 2 小時 3 分鐘後響起",
    );
  });
});

describe("computeNextAlarm", () => {
  it("returns null when no alarms are enabled", () => {
    const now = new Date(2024, 0, 3, 10, 0, 0, 0);
    expect(
      computeNextAlarm([baseAlarm({ enabled: false })], dayjs(now)),
    ).toBeNull();
  });

  it("returns null when alarms list is empty", () => {
    const now = new Date(2024, 0, 3, 10, 0, 0, 0);
    expect(computeNextAlarm([], dayjs(now))).toBeNull();
  });

  describe("boundary conditions", () => {
    const now = dayjs(new Date(2024, 0, 3, 10, 0, 0, 0));

    it("rolls forward one week when candidate equals now", () => {
      const result = computeNextAlarm(
        [baseAlarm({ days: ["Wed"], hour: 10, minute: 0 })],
        now,
      );
      expect(result).toEqual({ days: 7, hours: 0, minutes: 0 });
    });

    it("does not roll forward when candidate is one minute after now", () => {
      const result = computeNextAlarm(
        [baseAlarm({ days: ["Wed"], hour: 10, minute: 1 })],
        now,
      );
      expect(result).toEqual({ days: 0, hours: 0, minutes: 1 });
    });

    it("rolls forward one week when candidate is one minute before now", () => {
      const result = computeNextAlarm(
        [baseAlarm({ days: ["Wed"], hour: 9, minute: 59 })],
        now,
      );
      expect(result).toEqual({ days: 6, hours: 23, minutes: 59 });
    });
  });
});
