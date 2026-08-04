const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIZZLE = path.join(ROOT, "drizzle");
const META = path.join(DRIZZLE, "meta");

function backup() {
  const sqlFiles = fs
    .readdirSync(DRIZZLE)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();

  if (sqlFiles.length === 0) {
    console.log("No migration SQL files to squash.");
    process.exit(0);
  }

  const sqlBackup = {};
  for (const f of sqlFiles) {
    sqlBackup[f] = fs.readFileSync(path.join(DRIZZLE, f), "utf-8");
  }

  const snapshotBackup = {};
  const snapshotFiles = fs
    .readdirSync(META)
    .filter((f) => /^\d{4}_snapshot\.json$/.test(f));
  for (const f of snapshotFiles) {
    snapshotBackup[f] = fs.readFileSync(path.join(META, f), "utf-8");
  }

  const journalPath = path.join(META, "_journal.json");
  const journalBackup = fs.readFileSync(journalPath, "utf-8");

  const migrationsPath = path.join(DRIZZLE, "migrations.js");
  const migrationsBackup = fs.readFileSync(migrationsPath, "utf-8");

  return {
    sqlBackup,
    sqlFiles,
    snapshotBackup,
    snapshotFiles,
    journalBackup,
    journalPath,
    migrationsBackup,
    migrationsPath,
  };
}

function restore(bkp) {
  const squashedSql = path.join(DRIZZLE, "0000_init.sql");
  if (fs.existsSync(squashedSql)) {
    fs.unlinkSync(squashedSql);
  }

  const squashedSnapshot = path.join(META, "0000_snapshot.json");
  if (fs.existsSync(squashedSnapshot)) {
    fs.unlinkSync(squashedSnapshot);
  }

  for (const [name, content] of Object.entries(bkp.sqlBackup)) {
    fs.writeFileSync(path.join(DRIZZLE, name), content);
  }

  for (const [name, content] of Object.entries(bkp.snapshotBackup)) {
    fs.writeFileSync(path.join(META, name), content);
  }

  fs.writeFileSync(bkp.journalPath, bkp.journalBackup);
  fs.writeFileSync(bkp.migrationsPath, bkp.migrationsBackup);
}

function squash() {
  const bkp = backup();

  try {
    const combinedSQL = bkp.sqlFiles
      .map((f) => bkp.sqlBackup[f].trim())
      .join("\n\n");

    for (const f of bkp.sqlFiles) {
      fs.unlinkSync(path.join(DRIZZLE, f));
    }

    fs.writeFileSync(path.join(DRIZZLE, "0000_init.sql"), combinedSQL + "\n");

    if (Object.keys(bkp.snapshotBackup).length > 0) {
      const snapshotNames = Object.keys(bkp.snapshotBackup).sort();
      const latest = snapshotNames[snapshotNames.length - 1];
      const snapshot = JSON.parse(bkp.snapshotBackup[latest]);
      snapshot.prevId = "00000000-0000-0000-0000-000000000000";

      for (const f of snapshotNames) {
        fs.unlinkSync(path.join(META, f));
      }

      fs.writeFileSync(
        path.join(META, "0000_snapshot.json"),
        JSON.stringify(snapshot, null, 2) + "\n",
      );
    }

    const journal = JSON.parse(bkp.journalBackup);
    journal.entries = [
      {
        idx: 0,
        version: "6",
        when: Date.now(),
        tag: "0000_init",
        breakpoints: true,
      },
    ];
    fs.writeFileSync(bkp.journalPath, JSON.stringify(journal, null, 2) + "\n");

    const migrationsJs =
      "// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo\n\n" +
      'import journal from "./meta/_journal.json";\n' +
      'import m0000 from "./0000_init.sql";\n\n' +
      "export default {\n  journal,\n  migrations: {\n    m0000,\n  },\n};\n";

    fs.writeFileSync(bkp.migrationsPath, migrationsJs);

    console.log("Migrations squashed successfully into 0000_init.sql");
  } catch (err) {
    console.error("Squash failed:", err.message);
    restore(bkp);
    console.log("Original migration files restored.");
    process.exit(1);
  }
}

squash();
