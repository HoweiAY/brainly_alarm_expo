export const DEFAULT_LANGUAGE = "en" as const;

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh-Hant", label: "繁體中文" },
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export interface LocalePreference {
  languageCode: string | null;
  languageTag: string;
  languageScriptCode?: string | null;
  regionCode?: string | null;
}

const TRADITIONAL_CHINESE_REGIONS = new Set(["HK", "MO", "TW"]);

export function isAppLanguage(value: unknown): value is AppLanguage {
  return SUPPORTED_LANGUAGES.some(({ code }) => code === value);
}

export function resolveAppLanguage(
  locales: readonly LocalePreference[],
): AppLanguage {
  for (const locale of locales) {
    const languageCode = locale.languageCode?.toLowerCase();
    if (languageCode === "en") return "en";
    if (languageCode !== "zh") continue;
    const tag = locale.languageTag.toLowerCase();
    const script = locale.languageScriptCode?.toLowerCase();
    const region = locale.regionCode?.toUpperCase();
    if (script === "hans" || tag.includes("-hans")) continue;
    if (
      script === "hant" ||
      tag.includes("-hant") ||
      (region != null && TRADITIONAL_CHINESE_REGIONS.has(region))
    ) {
      return "zh-Hant";
    }
  }
  return DEFAULT_LANGUAGE;
}
