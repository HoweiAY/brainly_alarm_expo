import { isSameTrigger, resolveActiveSnapshot } from "@/alarms/activeSnapshot";
import {
  clearPersistedActiveAlarm,
  getPersistedActiveAlarm,
  persistActiveAlarm,
} from "@/data/activeAlarm";
import type { ActiveAlarmSnapshot, AlarmSnapshot } from "@/data/types";
import dayjs from "dayjs";
import { create } from "zustand";

interface AlarmFiringStoreState {
  activeSnapshot: ActiveAlarmSnapshot | null;
  activatedAt: number | null;
  loaded: boolean;
  setActive: (
    snapshot: AlarmSnapshot | ActiveAlarmSnapshot,
  ) => ActiveAlarmSnapshot;
  clearActive: () => void;
  init: () => Promise<void>;
}

export const useAlarmFiringStore = create<AlarmFiringStoreState>(
  (set, get) => ({
    activeSnapshot: null,
    activatedAt: null,
    loaded: false,
    setActive: (snapshot) => {
      const now = dayjs().valueOf();
      const { activeSnapshot, activatedAt } = get();
      const current =
        activeSnapshot && activatedAt !== null
          ? { snapshot: activeSnapshot, activatedAt }
          : null;
      const resolved = resolveActiveSnapshot(snapshot, current, now);
      set({
        activeSnapshot: resolved,
        activatedAt: isSameTrigger(snapshot, current, now)
          ? current.activatedAt
          : now,
      });
      void persistActiveAlarm(resolved);
      return resolved;
    },
    clearActive: () => {
      set({ activeSnapshot: null, activatedAt: null });
      void clearPersistedActiveAlarm();
    },
    init: async () => {
      if (get().loaded) return;
      const persisted = await getPersistedActiveAlarm();
      set({
        activeSnapshot: persisted
          ? resolveActiveSnapshot(persisted, null, dayjs().valueOf())
          : null,
        loaded: true,
      });
    },
  }),
);
