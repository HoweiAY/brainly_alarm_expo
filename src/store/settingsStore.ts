import { DEFAULT_USER_SETTINGS } from "@/data/constants";
import type { UserSettings } from "@/data/types";
import {
  getPersistedUserSettings,
  persistUserSettings,
} from "@/data/userSettings";
import { i18n } from "@/i18n";
import { getDeviceLanguage } from "@/i18n/device";
import { create } from "zustand";

interface SettingsStoreState {
  settings: UserSettings;
  loaded: boolean;
  initError: string | null;
  _initPromise: Promise<void> | null;
  init: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}

let updateQueue = Promise.resolve();
const initialLanguage = getDeviceLanguage();
const initialSettings: UserSettings = {
  ...DEFAULT_USER_SETTINGS,
  language: initialLanguage,
};

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  settings: initialSettings,
  loaded: false,
  initError: null,
  _initPromise: null,

  init: () => {
    const existing = get()._initPromise;
    if (existing) return existing;
    const promise = (async () => {
      try {
        const persisted = await getPersistedUserSettings(initialLanguage);
        const settings = persisted ?? initialSettings;
        if (!persisted) {
          await persistUserSettings(settings);
        }
        await i18n.changeLanguage(settings.language);
        set({
          settings,
          loaded: true,
          initError: null,
        });
      } catch (e) {
        console.error("settingsStore.init failed", e);
        set({
          loaded: false,
          initError: e instanceof Error ? e.message : String(e),
          _initPromise: null,
        });
      }
    })();
    set({ _initPromise: promise });
    return promise;
  },

  ensureLoaded: () => (get().loaded ? Promise.resolve() : get().init()),

  updateSettings: (patch) => {
    const update = updateQueue.then(async () => {
      await get().ensureLoaded();
      if (!get().loaded) {
        throw new Error("Settings must load before they can be updated");
      }
      const previous = get().settings;
      const next = { ...previous, ...patch };
      set({ settings: next });
      try {
        await persistUserSettings(next);
      } catch (e) {
        set({ settings: previous });
        throw e;
      }
    });
    updateQueue = update.catch(() => {});
    return update;
  },
}));

export function getSnoozeMinutes(): number {
  return useSettingsStore.getState().settings.snoozeMinutes;
}
