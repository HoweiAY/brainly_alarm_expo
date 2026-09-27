import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import { db, dbReady } from "./db";
import { activeAlarmTable } from "./schema";
import type { AlarmActivation } from "./types";

/**
 * Replaces the single persisted activation, including its resolved task and
 * activation time, while preserving the row's original creation timestamp.
 *
 * @throws Rejects on database migration or write failures.
 */
export async function persistActiveAlarm(
  activation: AlarmActivation,
): Promise<void> {
  await dbReady;
  const now = dayjs().valueOf();
  await db
    .insert(activeAlarmTable)
    .values({
      id: "current",
      payload: activation,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: activeAlarmTable.id,
      set: { payload: activation, updatedAt: now },
    });
}

export async function clearPersistedActiveAlarm(): Promise<void> {
  await dbReady;
  await db.delete(activeAlarmTable).where(eq(activeAlarmTable.id, "current"));
}

/**
 * Reads the stored activation as-is, or returns null if no current row exists.
 * The payload is not validated or normalized here.
 *
 * @throws Rejects on database migration or read failures.
 */
export async function getPersistedActiveAlarm(): Promise<AlarmActivation | null> {
  await dbReady;
  const rows = await db
    .select({ payload: activeAlarmTable.payload })
    .from(activeAlarmTable)
    .where(eq(activeAlarmTable.id, "current"))
    .limit(1);
  return rows[0]?.payload ?? null;
}
