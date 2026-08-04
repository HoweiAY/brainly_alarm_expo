package expo.modules.alarmscheduler

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

class AlarmSoundService : Service() {
  companion object {
    @Volatile
    var currentSnapshot: AlarmSnapshotData? = null
    private const val EXTRA_SOUND_URI = "soundUri"
    private const val EXTRA_HAS_SNAPSHOT = "hasSnapshot"

    fun start(context: Context, soundUri: String?, snapshot: AlarmSnapshotData?) {
      val intent = Intent(context, AlarmSoundService::class.java).apply {
        putExtra(EXTRA_SOUND_URI, soundUri)
        putExtra(EXTRA_HAS_SNAPSHOT, snapshot != null)
        if (snapshot != null) putSnapshot(this, snapshot)
      }
      runCatching {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
      }.onFailure { Log.e("AlarmSoundService", "Failed to start service", it) }
    }

    fun stop(context: Context) {
      runCatching { context.stopService(Intent(context, AlarmSoundService::class.java)) }
    }
  }

  private var mediaPlayer: MediaPlayer? = null

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val soundUri = intent?.getStringExtra(EXTRA_SOUND_URI)
    val hasSnapshot = intent?.getBooleanExtra(EXTRA_HAS_SNAPSHOT, false) ?: false
    val snapshot = if (hasSnapshot && intent != null) readSnapshot(intent) else null
    currentSnapshot = snapshot

    val notification = buildNotification(snapshot)
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
    } else {
      0
    }
    runCatching {
      ServiceCompat.startForeground(this, ALARM_NOTIFICATION_ID, notification, type)
    }.onFailure { Log.e("AlarmSoundService", "startForeground failed", it) }

    startPlayback(soundUri)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    mediaPlayer?.let { player ->
      runCatching { player.stop() }
      runCatching { player.release() }
    }
    mediaPlayer = null
    currentSnapshot = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(NotificationManager::class.java)
      val existing = manager.getNotificationChannel(ALARM_CHANNEL_ID)
      if (existing != null && existing.sound != null) {
        manager.deleteNotificationChannel(ALARM_CHANNEL_ID)
      }
      if (manager.getNotificationChannel(ALARM_CHANNEL_ID) == null) {
        val channel = NotificationChannel(
          ALARM_CHANNEL_ID,
          "Alarms",
          NotificationManager.IMPORTANCE_HIGH,
        ).apply {
          enableVibration(true)
          setBypassDnd(true)
          setSound(
            null,
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_ALARM)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build(),
          )
        }
        manager.createNotificationChannel(channel)
      }
    }
  }

  private fun buildNotification(snapshot: AlarmSnapshotData?): Notification {
    val deepLink = if (snapshot != null) snapshotToDeepLink(snapshot)
      else Uri.parse("$DEEP_LINK_SCHEME://$DEEP_LINK_HOST")
    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      Intent(Intent.ACTION_VIEW, deepLink).addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP,
      ),
      PendingIntent.FLAG_IMMUTABLE,
    )
    val title = if (snapshot != null) snapshot.notificationTitle else "Time to wake up!"
    val body = if (snapshot != null) snapshot.notificationBody else "Click to disable the alarm."
    return NotificationCompat.Builder(this, ALARM_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(title)
      .setContentText(body)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setSilent(true)
      .setFullScreenIntent(contentIntent, true)
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .build()
  }

  private fun startPlayback(soundUri: String?) {
    mediaPlayer?.let { runCatching { it.release() } }
    val player = MediaPlayer()
    val attrs = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
    player.setAudioAttributes(attrs)
    player.isLooping = true
    try {
      val uri = if (soundUri != null) Uri.parse(soundUri)
        else Settings.System.DEFAULT_ALARM_ALERT_URI
      player.setDataSource(this, uri)
      player.prepare()
      player.start()
    } catch (e: Exception) {
      Log.w("AlarmSoundService", "Playback failed, retrying with default", e)
      runCatching {
        player.reset()
        player.setAudioAttributes(attrs)
        player.isLooping = true
        player.setDataSource(this, Settings.System.DEFAULT_ALARM_ALERT_URI)
        player.prepare()
        player.start()
      }.onFailure { Log.e("AlarmSoundService", "Default playback also failed", it) }
    }
    mediaPlayer = player
  }
}
