import { DEFAULT_USER_SETTINGS } from "@/data/constants";
import type { UserSettings } from "@/data/types";
import {
  getPersistedUserSettings,
  persistUserSettings,
} from "@/data/userSettings";
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

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  settings: { ...DEFAULT_USER_SETTINGS },
  loaded: false,
  initError: null,
  _initPromise: null,

  init: () => {
    const existing = get()._initPromise;
    if (existing) return existing;
    const promise = (async () => {
      try {
        const persisted = await getPersistedUserSettings();
        set({
          settings: persisted ?? { ...DEFAULT_USER_SETTINGS },
          loaded: true,
          initError: null,
        });
      } catch (e) {
        console.error("settingsStore.init failed", e);
        set({
          loaded: true,
          initError: e instanceof Error ? e.message : String(e),
        });
      }
    })();
    set({ _initPromise: promise });
    return promise;
  },

  ensureLoaded: () => (get().loaded ? Promise.resolve() : get().init()),

  updateSettings: async (patch) => {
    const previous = get().settings;
    const next = { ...previous, ...patch };
    set({ settings: next });
    try {
      await persistUserSettings(next);
    } catch (e) {
      set({ settings: previous });
      throw e;
    }
  },
}));

export function getSnoozeMinutes(): number {
  return useSettingsStore.getState().settings.snoozeMinutes;
}
