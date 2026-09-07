import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import { normalizeUserSettings } from "@/settings/userSettings";
import { db, dbReady } from "./db";
import { settingsTable } from "./schema";
import type { UserSettings } from "./types";

const SETTINGS_ROW_ID = "current";

export async function persistUserSettings(
  settings: UserSettings,
): Promise<void> {
  await dbReady;
  const now = dayjs().valueOf();
  await db
    .insert(settingsTable)
    .values({
      id: SETTINGS_ROW_ID,
      payload: settings,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { payload: settings, updatedAt: now },
    });
}

export async function getPersistedUserSettings(): Promise<UserSettings | null> {
  await dbReady;
  const rows = await db
    .select({ payload: settingsTable.payload })
    .from(settingsTable)
    .where(eq(settingsTable.id, SETTINGS_ROW_ID))
    .limit(1);
  const payload = rows[0]?.payload;
  return payload ? normalizeUserSettings(payload) : null;
}
