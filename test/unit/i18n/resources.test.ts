import {
  translateDifficulty,
  translateTask,
  translateWeekday,
} from "@/i18n/helpers";
import { en } from "@/i18n/locales/en";
import { zhHant } from "@/i18n/locales/zh-Hant";
import { beforeAll, describe, expect, it } from "@jest/globals";
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

describe("translation resources", () => {
  it("translates shared domain labels", async () => {
    expect(instance.t("common.tasks.ShakePhone")).toBe("Shake phone");
    await instance.changeLanguage("zh-Hant");
    expect(instance.t("common.tasks.ShakePhone")).toBe("搖動手機");
    expect(instance.t("common.difficulties.Hard")).toBe("困難");
  });

  it("translates canonical editor domain values through helpers", async () => {
    await instance.changeLanguage("en");
    expect(translateWeekday(instance.t, "Mon")).toBe("Mon");
    expect(translateTask(instance.t, "Shake phone")).toBe("Shake phone");
    expect(translateDifficulty(instance.t, "Hard")).toBe("Hard");

    await instance.changeLanguage("zh-Hant");
    expect(translateWeekday(instance.t, "Mon")).toBe("一");
    expect(translateTask(instance.t, "Shake phone")).toBe("搖動手機");
    expect(translateDifficulty(instance.t, "Hard")).toBe("困難");
    expect(instance.t("editor.am")).toBe("上午");
    expect(instance.t("editor.pm")).toBe("下午");
  });

  it("interpolates and pluralizes English copy", async () => {
    await instance.changeLanguage("en");
    expect(instance.t("common.units.alarm", { count: 1 })).toBe("1 alarm");
    expect(instance.t("common.units.alarm", { count: 3 })).toBe("3 alarms");
    expect(instance.t("home.conflictMessage", { time: "08:30" })).toContain(
      "08:30",
    );
  });

  it("interpolates Traditional Chinese copy", async () => {
    await instance.changeLanguage("zh-Hant");
    expect(instance.t("common.units.alarm", { count: 3 })).toBe("3 個鬧鐘");
    expect(instance.t("home.conflictMessage", { time: "08:30" })).toBe(
      "已設定相同時間（08:30）的鬧鐘。",
    );
  });
});
