import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
