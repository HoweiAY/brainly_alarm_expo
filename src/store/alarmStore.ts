import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";
import { asc, eq } from "drizzle-orm";
import { create } from "zustand";
import {
  alarmToUpdateSet,
  draftToInsert,
  rowToAlarm,
} from "@/data/conversions";
import { db, dbReady } from "@/data/db";
import { alarmsTable } from "@/data/schema";
import type { Alarm } from "@/data/types";
import { getAlarmScheduler } from "@/alarms/AlarmScheduler";
import { snoozeIdentifierFor } from "@/alarms/weeklyTrigger";
import { useAlarmRegistrationsStore } from "@/store/alarmRegistrationsStore";

interface AlarmStoreState {
  alarms: Alarm[];
  loaded: boolean;
  loading: boolean;
  initError: string | null;
  snoozedCount: number;
  _disposer: (() => void) | null;
  _initializing: boolean;
  init: () => void;
  loadAlarms: () => void;
  insertAlarm: (draft: Omit<Alarm, "id">) => Promise<string>;
  updateAlarm: (alarm: Alarm) => Promise<void>;
  deleteAlarm: (alarm: { id: string }) => Promise<void>;
  getAlarmById: (id: string) => Promise<Alarm | null>;
  getAllAlarms: () => Alarm[];
  dismissAllSnoozedAlarms: () => Promise<number>;
}

export const useAlarmStore = create<AlarmStoreState>((set, get) => {
  const fetchAlarms = async () => {
    const rows = await db
      .select()
      .from(alarmsTable)
      .orderBy(asc(alarmsTable.hour), asc(alarmsTable.minute));
    set({ alarms: rows.map(rowToAlarm), loaded: true, loading: false });
  };

  const syncSnoozedCount = () => {
    const registryState = useAlarmRegistrationsStore.getState();
    const count = registryState.records.filter(
      (r) => r.type === "snooze",
    ).length;
    set({ snoozedCount: count });
  };

  return {
    alarms: [],
    loaded: false,
    loading: false,
    initError: null,
    snoozedCount: 0,
    _disposer: null,
    _initializing: false,

    init: () => {
      if (get()._initializing) return;
      const previous = get()._disposer;
      if (previous) previous();

      set({
        loading: true,
        _initializing: true,
        _disposer: null,
        initError: null,
      });

      (async () => {
        try {
          await dbReady;
          await fetchAlarms();

          const registryStore = useAlarmRegistrationsStore.getState();
          if (!registryStore._disposer || !registryStore.loaded) {
            registryStore.init();
          }

          syncSnoozedCount();

          const dbSubscription = SQLite.addDatabaseChangeListener((event) => {
            if (event.tableName === "alarms") void fetchAlarms();
          });

          const unsubReg = useAlarmRegistrationsStore.subscribe((state) => {
            const count = state.records.filter(
              (r) => r.type === "snooze",
            ).length;
            set({ snoozedCount: count });
          });

          set({
            _disposer: () => {
              dbSubscription.remove();
              unsubReg();
            },
          });
        } catch (e) {
          console.error("alarmStore.init failed", e);
          set({
            loading: false,
            initError: e instanceof Error ? e.message : String(e),
          });
        } finally {
          set({ _initializing: false });
        }
      })();
    },

    loadAlarms: () => {
      if (get()._disposer || get()._initializing) return;
      get().init();
    },

    insertAlarm: async (draft) => {
      await dbReady;
      const id = Crypto.randomUUID();
      await db.insert(alarmsTable).values(draftToInsert(draft, id, Date.now()));
      return id;
    },

    updateAlarm: async (alarm) => {
      await dbReady;
      await db
        .update(alarmsTable)
        .set(alarmToUpdateSet(alarm, Date.now()))
        .where(eq(alarmsTable.id, alarm.id));
    },

    deleteAlarm: async (alarm) => {
      await dbReady;
      await db.delete(alarmsTable).where(eq(alarmsTable.id, alarm.id));
    },

    getAlarmById: async (id) => {
      await dbReady;
      const rows = await db
        .select()
        .from(alarmsTable)
        .where(eq(alarmsTable.id, id))
        .limit(1);
      return rows[0] ? rowToAlarm(rows[0]) : null;
    },

    getAllAlarms: () => get().alarms,

    dismissAllSnoozedAlarms: async () => {
      const registryStore = useAlarmRegistrationsStore.getState();
      const snoozed = registryStore.records
        .filter((r) => r.type === "snooze")
        .map((r) => ({ alarmId: r.alarmId, generation: r.generation }));

      if (snoozed.length === 0) return 0;

      const native = getAlarmScheduler();

      const results = await Promise.allSettled(
        snoozed.map(async ({ alarmId, generation }) => {
          const current = useAlarmRegistrationsStore
            .getState()
            .records.find((r) => r.alarmId === alarmId && r.type === "snooze");
          if (!current || current.generation !== generation) {
            return;
          }
          await native.cancel(snoozeIdentifierFor(alarmId));
          await registryStore.remove(alarmId, "snooze");
        }),
      );

      const rejected = results.filter((r) => r.status === "rejected");
      const failed = rejected.length;
      if (failed > 0) {
        const reasons = rejected.map(
          (r) => (r as PromiseRejectedResult).reason,
        );
        console.error(`Failed to dismiss ${failed} snoozed alarm(s)`, reasons);
        throw new Error(
          `Failed to dismiss ${failed} snoozed alarm(s): ${reasons.join(", ")}`,
        );
      }

      return results.filter((r) => r.status === "fulfilled").length;
    },
  };
});
