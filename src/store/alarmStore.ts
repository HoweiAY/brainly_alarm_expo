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

interface AlarmStoreState {
  alarms: Alarm[];
  loaded: boolean;
  loading: boolean;
  _disposer: (() => void) | null;
  init: () => void;
  loadAlarms: () => void;
  insertAlarm: (draft: Omit<Alarm, "id">) => Promise<string>;
  updateAlarm: (alarm: Alarm) => Promise<void>;
  deleteAlarm: (alarm: { id: string }) => Promise<void>;
  getAlarmById: (id: string) => Promise<Alarm | null>;
  getAllAlarms: () => Alarm[];
}

export const useAlarmStore = create<AlarmStoreState>((set, get) => {
  const fetchAlarms = async () => {
    const rows = await db
      .select()
      .from(alarmsTable)
      .orderBy(asc(alarmsTable.hour), asc(alarmsTable.minute));
    set({ alarms: rows.map(rowToAlarm), loaded: true, loading: false });
  };

  return {
    alarms: [],
    loaded: false,
    loading: false,
    _disposer: null,

    init: () => {
      const previous = get()._disposer;
      if (previous) previous();

      set({ loading: true });

      (async () => {
        try {
          await dbReady;
          await fetchAlarms();
          const subscription = SQLite.addDatabaseChangeListener((event) => {
            if (event.tableName === "alarms") void fetchAlarms();
          });
          set({ _disposer: () => subscription.remove() });
        } catch (e) {
          console.error("alarmStore.init failed", e);
          set({ loading: false });
        }
      })();
    },

    loadAlarms: () => {
      if (get()._disposer) return;
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
  };
});
