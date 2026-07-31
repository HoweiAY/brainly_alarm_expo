import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../../drizzle/migrations";

export const DB_NAME = "alarm_database";

const expoDb = SQLite.openDatabaseSync(DB_NAME, { enableChangeListener: true });

export const db = drizzle(expoDb);

export const dbReady: Promise<void> = migrate(db, migrations).catch((e) => {
  console.error("Drizzle migration failed", e);
  throw e;
});
