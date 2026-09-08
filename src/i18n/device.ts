import { getLocales } from "expo-localization";
import { resolveAppLanguage, type AppLanguage } from "./languages";

export function getDeviceLanguage(): AppLanguage {
  return resolveAppLanguage(getLocales());
}
