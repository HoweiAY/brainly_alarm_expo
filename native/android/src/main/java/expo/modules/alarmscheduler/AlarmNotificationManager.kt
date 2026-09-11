package expo.modules.alarmscheduler

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat

object AlarmNotificationManager {
  const val NOTIFICATION_ID = 4269
  private const val LEGACY_CHANNEL_ID = "brainly_alarm_id"
  private const val FOREGROUND_CHANNEL_ID = "brainly_alarm_foreground"

  fun syncChannel(context: Context, channelName: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    manager.getNotificationChannel(LEGACY_CHANNEL_ID)?.let {
      manager.deleteNotificationChannel(LEGACY_CHANNEL_ID)
    }
    val channel = NotificationChannel(
      FOREGROUND_CHANNEL_ID,
      channelName,
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      enableVibration(true)
      setBypassDnd(true)
      setShowBadge(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
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

  fun createForegroundNotification(
    context: Context,
    snapshot: AlarmSnapshotData?,
  ): Notification {
    val copy = notificationCopy(context)
    syncChannel(context, copy.channelName)
    val deepLink = if (snapshot != null) snapshotToDeepLink(snapshot)
      else Uri.parse("$DEEP_LINK_SCHEME://$DEEP_LINK_HOST")
    val contentIntent = PendingIntent.getActivity(
      context,
      0,
      Intent(Intent.ACTION_VIEW, deepLink).addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP,
      ),
      PendingIntent.FLAG_IMMUTABLE,
    )
    val title = snapshot?.notificationTitle?.takeIf { it.isNotBlank() } ?: copy.title
    val body = snapshot?.notificationBody?.takeIf { it.isNotBlank() } ?: copy.body
    return NotificationCompat.Builder(context, FOREGROUND_CHANNEL_ID)
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

  private fun notificationCopy(context: Context): AlarmNotificationCopy = runCatching {
    AlarmStore(context).use { alarmNotificationCopy(it.getLanguage()) }
  }.getOrDefault(ENGLISH_ALARM_NOTIFICATION_COPY)
}
