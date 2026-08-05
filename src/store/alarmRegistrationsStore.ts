import * as SQLite from "expo-sqlite";
import { and, eq } from "drizzle-orm";
import { create } from "zustand";
import { db, dbReady } from "@/data/db";
import { alarmRegistrationsTable } from "@/data/schema";

export type RegistrationType = "weekly" | "snooze";

export interface RegistrationRecord {
  alarmId: string;
  type: RegistrationType;
}

interface AlarmRegistrationsStoreState {
  records: RegistrationRecord[];
  loaded: boolean;
  loading: boolean;
  initError: string | null;
  _disposer: (() => void) | null;
  _initializing: boolean;
  init: () => void;
  load: () => void;
  upsert: (alarmId: string, type: RegistrationType) => Promise<void>;
  remove: (alarmId: string, type: RegistrationType) => Promise<void>;
  removeForAlarm: (alarmId: string) => Promise<void>;
  getAll: () => RegistrationRecord[];
  getForAlarm: (alarmId: string) => RegistrationRecord[];
  has: (alarmId: string, type: RegistrationType) => boolean;
}

export const useAlarmRegistrationsStore = create<AlarmRegistrationsStoreState>(
  (set, get) => {
    const fetchRecords = async () => {
      const rows = await db.select().from(alarmRegistrationsTable);
      set({
        records: rows.map((r) => ({
          alarmId: r.alarmId,
          type: r.type as RegistrationType,
        })),
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
              if (event.tableName === "alarm_registrations")
                void fetchRecords();
            });
            set({ _disposer: () => subscription.remove() });
          } catch (e) {
            console.error("alarmRegistrationsStore.init failed", e);
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

      upsert: async (alarmId, type) => {
        await dbReady;
        await db
          .insert(alarmRegistrationsTable)
          .values({ alarmId, type })
          .onConflictDoUpdate({
            target: [
              alarmRegistrationsTable.alarmId,
              alarmRegistrationsTable.type,
            ],
            set: { alarmId, type },
          });
      },

      remove: async (alarmId, type) => {
        await dbReady;
        await db
          .delete(alarmRegistrationsTable)
          .where(
            and(
              eq(alarmRegistrationsTable.alarmId, alarmId),
              eq(alarmRegistrationsTable.type, type),
            ),
          );
      },

      removeForAlarm: async (alarmId) => {
        await dbReady;
        await db
          .delete(alarmRegistrationsTable)
          .where(eq(alarmRegistrationsTable.alarmId, alarmId));
      },

      getAll: () => get().records,
      getForAlarm: (alarmId) =>
        get().records.filter((r) => r.alarmId === alarmId),
      has: (alarmId, type) =>
        get().records.some((r) => r.alarmId === alarmId && r.type === type),
    };
  },
);
