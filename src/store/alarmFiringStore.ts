import type { AlarmSnapshot } from "@/data/types";
import {
  clearPersistedActiveAlarm,
  persistActiveAlarm,
  getPersistedActiveAlarm,
} from "@/data/activeAlarm";
import { create } from "zustand";

interface AlarmFiringStoreState {
  activeSnapshot: AlarmSnapshot | null;
  loaded: boolean;
  setActive: (snapshot: AlarmSnapshot) => void;
  clearActive: () => void;
  init: () => Promise<void>;
}

export const useAlarmFiringStore = create<AlarmFiringStoreState>(
  (set, get) => ({
    activeSnapshot: null,
    loaded: false,
    setActive: (snapshot) => {
      set({ activeSnapshot: snapshot });
      void persistActiveAlarm(snapshot);
    },
    clearActive: () => {
      set({ activeSnapshot: null });
      void clearPersistedActiveAlarm();
    },
    init: async () => {
      if (get().loaded) return;
      const persisted = await getPersistedActiveAlarm();
      set({ activeSnapshot: persisted, loaded: true });
    },
  }),
);
