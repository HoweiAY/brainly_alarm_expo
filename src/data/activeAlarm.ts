import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import { db, dbReady } from "./db";
import { activeAlarmTable } from "./schema";
import type { AlarmSnapshot } from "./types";

export async function persistActiveAlarm(
  snapshot: AlarmSnapshot,
): Promise<void> {
  await dbReady;
  const now = dayjs().valueOf();
  await db
    .insert(activeAlarmTable)
    .values({
      id: "current",
      payload: snapshot,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: activeAlarmTable.id,
      set: { payload: snapshot, updatedAt: now },
    });
}

export async function clearPersistedActiveAlarm(): Promise<void> {
  await dbReady;
  await db.delete(activeAlarmTable).where(eq(activeAlarmTable.id, "current"));
}

export async function getPersistedActiveAlarm(): Promise<AlarmSnapshot | null> {
  await dbReady;
  const rows = await db
    .select({ payload: activeAlarmTable.payload })
    .from(activeAlarmTable)
    .where(eq(activeAlarmTable.id, "current"))
    .limit(1);
  return rows[0]?.payload ?? null;
}
