import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { AlarmSnapshot } from "./types";

export const alarmsTable = sqliteTable("alarms", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  days: text("days", { mode: "json" }).$type<number[]>().notNull(),
  hour: integer("hour").notNull(),
  minute: integer("minute").notNull(),
  task: text("task").notNull(),
  rounds: integer("rounds").notNull(),
  difficulty: integer("difficulty").notNull(),
  sound: text("sound"),
  isSnooze: integer("is_snooze", { mode: "boolean" }).notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
});

export const alarmRegistrationsTable = sqliteTable(
  "alarm_registrations",
  {
    alarmId: text("alarm_id").notNull(),
    type: text("type").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.alarmId, table.type] }),
  }),
);

export const activeAlarmTable = sqliteTable("active_alarm", {
  id: text("id").primaryKey(),
  payload: text("payload", { mode: "json" }).$type<AlarmSnapshot>().notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
