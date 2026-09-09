import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { getDeviceLanguage } from "./device";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "./languages";
import { en } from "./locales/en";
import { zhHant } from "./locales/zh-Hant";

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-Hant": { translation: zhHant },
  },
  lng: getDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES.map(({ code }) => code),
  load: "currentOnly",
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export * from "./languages";
export { i18n };
