import * as SQLite from "expo-sqlite";
import { eq } from "drizzle-orm";
import { create } from "zustand";
import {
  recordToInsert,
  recordToUpdateSet,
  scheduledRowToRecord,
} from "@/data/conversions";
import { db, dbReady } from "@/data/db";
import { scheduledAlarmsTable } from "@/data/schema";
import type { ScheduledAlarmRecord } from "@/data/types";

interface ScheduledAlarmsStoreState {
  records: ScheduledAlarmRecord[];
  loaded: boolean;
  loading: boolean;
  initError: string | null;
  _disposer: (() => void) | null;
  _initializing: boolean;
  init: () => void;
  load: () => void;
  upsert: (
    record: Omit<ScheduledAlarmRecord, "createdAt" | "updatedAt">,
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeForAlarm: (alarmId: string) => Promise<void>;
  getAll: () => ScheduledAlarmRecord[];
  getForAlarm: (alarmId: string) => ScheduledAlarmRecord[];
  getById: (id: string) => ScheduledAlarmRecord | null;
}

export const useScheduledAlarmsStore = create<ScheduledAlarmsStoreState>(
  (set, get) => {
    const fetchRecords = async () => {
      const rows = await db.select().from(scheduledAlarmsTable);
      set({
        records: rows.map(scheduledRowToRecord),
        loaded: true,
        loading: false,
      });
    };

    return {
      records: [],
      loaded: false,
      loading: false,
      initError: null,
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
            await fetchRecords();
            const subscription = SQLite.addDatabaseChangeListener((event) => {
              if (event.tableName === "scheduled_alarms") void fetchRecords();
            });
            set({ _disposer: () => subscription.remove() });
          } catch (e) {
            console.error("scheduledAlarmsStore.init failed", e);
            set({
              loading: false,
              initError: e instanceof Error ? e.message : String(e),
            });
          } finally {
            set({ _initializing: false });
          }
        })();
      },

      load: () => {
        if (get()._disposer || get()._initializing) return;
        get().init();
      },

      upsert: async (record) => {
        await dbReady;
        const now = Date.now();
        await db
          .insert(scheduledAlarmsTable)
          .values(recordToInsert(record, now))
          .onConflictDoUpdate({
            target: scheduledAlarmsTable.id,
            set: recordToUpdateSet(record, now),
          });
      },

      remove: async (id) => {
        await dbReady;
        await db
          .delete(scheduledAlarmsTable)
          .where(eq(scheduledAlarmsTable.id, id));
      },

      removeForAlarm: async (alarmId) => {
        await dbReady;
        await db
          .delete(scheduledAlarmsTable)
          .where(eq(scheduledAlarmsTable.alarmId, alarmId));
      },

      getAll: () => get().records,
      getForAlarm: (alarmId) =>
        get().records.filter((r) => r.alarmId === alarmId),
      getById: (id) => get().records.find((r) => r.id === id) ?? null,
    };
  },
);
