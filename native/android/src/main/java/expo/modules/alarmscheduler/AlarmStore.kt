package expo.modules.alarmscheduler

import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import org.json.JSONArray

data class StoredAlarm(
  val id: String,
  val days: List<Int>,
  val hour: Int,
  val minute: Int,
  val task: String,
  val rounds: Int,
  val difficulty: String,
  val sound: String?,
  val snooze: Boolean,
  val enabled: Boolean,
)

// Opens the same SQLite database that expo-sqlite uses (alarm_database) to read
// persisted alarms for boot re-arming. Read-only; never hardcodes a path — it
// relies on Context.getDatabasePath, the default expo-sqlite location.
class AlarmStore(context: Context) : AutoCloseable {
  private val db: SQLiteDatabase?

  init {
    val path = context.getDatabasePath("alarm_database")
    db = if (path.exists()) {
      runCatching {
        SQLiteDatabase.openDatabase(path.path, null, SQLiteDatabase.OPEN_READONLY)
      }.getOrNull()
    } else {
      null
    }
  }

  fun getEnabledAlarms(): List<StoredAlarm> {
    val database = db ?: return emptyList()
    if (!hasTable(database, "alarms")) return emptyList()
    return database.query("alarms", null, "is_enabled = 1", null, null, null, null).use { cursor ->
      val out = ArrayList<StoredAlarm>()
      while (cursor.moveToNext()) {
        out += readAlarm(cursor)
      }
      out
    }
  }

  override fun close() {
    db?.close()
  }

  private fun hasTable(database: SQLiteDatabase, name: String): Boolean {
    return database.rawQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      arrayOf(name),
    ).use { it.moveToFirst() }
  }

  private fun readAlarm(cursor: Cursor): StoredAlarm {
    val daysRaw = cursor.getString(cursor.getColumnIndexOrThrow("days"))
    return StoredAlarm(
      id = cursor.getString(cursor.getColumnIndexOrThrow("id")),
      days = parseDays(daysRaw),
      hour = cursor.getInt(cursor.getColumnIndexOrThrow("hour")),
      minute = cursor.getInt(cursor.getColumnIndexOrThrow("minute")),
      task = mapTask(cursor.getString(cursor.getColumnIndexOrThrow("task"))),
      rounds = cursor.getInt(cursor.getColumnIndexOrThrow("rounds")),
      difficulty = mapDifficulty(cursor.getInt(cursor.getColumnIndexOrThrow("difficulty"))),
      sound = cursor.getString(cursor.getColumnIndexOrThrow("sound")),
      snooze = cursor.getInt(cursor.getColumnIndexOrThrow("is_snooze")) != 0,
      enabled = cursor.getInt(cursor.getColumnIndexOrThrow("is_enabled")) != 0,
    )
  }

  private fun parseDays(raw: String): List<Int> {
    return try {
      val arr = JSONArray(raw)
      (0 until arr.length()).map { arr.getInt(it) }
    } catch (e: Exception) {
      emptyList()
    }
  }

  private fun mapTask(storage: String): String = when (storage) {
    "memory" -> "Memory"
    "math" -> "Math"
    "shake_phone" -> "Shake phone"
    "none" -> "None"
    else -> "Memory"
  }

  private fun mapDifficulty(index: Int): String = when (index) {
    0 -> "Easy"
    1 -> "Normal"
    2 -> "Hard"
    else -> "Easy"
  }
}
