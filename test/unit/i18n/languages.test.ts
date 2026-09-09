import { resolveAppLanguage, type LocalePreference } from "@/i18n/languages";
import { describe, expect, it } from "@jest/globals";

function locale(
  languageTag: string,
  languageCode: string,
  languageScriptCode?: string,
  regionCode?: string,
): LocalePreference {
  return { languageTag, languageCode, languageScriptCode, regionCode };
}

describe("resolveAppLanguage", () => {
  it("uses English device locales", () => {
    expect(resolveAppLanguage([locale("en-GB", "en", undefined, "GB")])).toBe(
      "en",
    );
  });

  it.each([
    locale("zh-Hant", "zh", "Hant"),
    locale("zh-TW", "zh", undefined, "TW"),
    locale("zh-HK", "zh", undefined, "HK"),
    locale("zh-MO", "zh", undefined, "MO"),
  ])("maps Traditional Chinese locale $languageTag", (preference) => {
    expect(resolveAppLanguage([preference])).toBe("zh-Hant");
  });

  it.each([
    locale("zh-Hans-CN", "zh", "Hans", "CN"),
    locale("zh-Hans-TW", "zh", "Hans", "TW"),
  ])("does not map Simplified Chinese to Traditional Chinese", (preference) => {
    expect(resolveAppLanguage([preference])).toBe("en");
  });

  it("uses the first supported preference in device order", () => {
    expect(
      resolveAppLanguage([
        locale("fr-FR", "fr", undefined, "FR"),
        locale("zh-Hant-HK", "zh", "Hant", "HK"),
        locale("en-US", "en", undefined, "US"),
      ]),
    ).toBe("zh-Hant");
  });

  it("falls back to English for unsupported and ambiguous locales", () => {
    expect(resolveAppLanguage([locale("fr-FR", "fr")])).toBe("en");
    expect(resolveAppLanguage([locale("zh", "zh")])).toBe("en");
    expect(resolveAppLanguage([])).toBe("en");
  });
});
