package com.zekraram.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * دور دهم — posts the reminder when its alarm fires, and writes down that it
 * fired.
 *
 * The delivery log is the point of the second half. «یادآوری نیامد» and
 * «یادآوری آمد و من ندیدمش» look identical from here, and for two rounds we had
 * no way to tell them apart. Every fire is now recorded with its timestamp, and
 * the app reads the last few back into the reminder-status card — so the next
 * report is evidence rather than a guess.
 */
public class ReminderAlarmReceiver extends BroadcastReceiver {

    public static final String ACTION_FIRE = "com.zekraram.app.REMINDER_FIRE";
    public static final String EXTRA_ID = "reminderId";
    public static final String EXTRA_TITLE = "reminderTitle";
    public static final String EXTRA_BODY = "reminderBody";
    public static final String EXTRA_CHANNEL = "reminderChannel";

    /** Read by the WebView through ReminderAlarmPlugin's own storage bridge. */
    public static final String PREFS = "zekraram_reminder_log";
    public static final String PREFS_KEY = "fired";
    private static final int LOG_LIMIT = 20;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_FIRE.equals(intent.getAction())) return;

        int id = intent.getIntExtra(EXTRA_ID, ReminderAlarmPlugin.ID_BASE);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String body = intent.getStringExtra(EXTRA_BODY);
        String channelId = intent.getStringExtra(EXTRA_CHANNEL);

        if (title == null || title.length() == 0) title = "ذکرآرام";
        if (body == null) body = "";

        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        // Only name a channel that exists — naming a missing one makes Android 8+
        // drop the notification with no error at all, which is the same silent
        // failure this whole area of the app has been fighting.
        String channel = usableChannel(manager, channelId);

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent tap = PendingIntent.getActivity(context, id, open, flags);

        NotificationCompat.Builder builder =
            (channel != null ? new NotificationCompat.Builder(context, channel)
                             : new NotificationCompat.Builder(context))
                .setSmallIcon(smallIcon(context))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(Notification.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(tap);

        manager.notify(id, builder.build());
        record(context, id, title, body);
    }

    private String usableChannel(NotificationManager manager, String requested) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return requested;
        if (requested == null || requested.length() == 0) return null;
        return manager.getNotificationChannel(requested) != null ? requested : null;
    }

    /** The app's own launcher icon; Android refuses a notification without a small icon. */
    private int smallIcon(Context context) {
        int id = context.getResources().getIdentifier("ic_stat_icon", "drawable", context.getPackageName());
        if (id != 0) return id;
        return context.getApplicationInfo().icon;
    }

    private void record(Context context, int id, String title, String body) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray log;
            try {
                log = new JSONArray(prefs.getString(PREFS_KEY, "[]"));
            } catch (Exception e) {
                log = new JSONArray();
            }
            JSONObject entry = new JSONObject();
            entry.put("id", id);
            entry.put("at", System.currentTimeMillis());
            entry.put("title", title);
            entry.put("body", body);

            JSONArray trimmed = new JSONArray();
            trimmed.put(entry);
            for (int i = 0; i < log.length() && trimmed.length() < LOG_LIMIT; i++) {
                trimmed.put(log.get(i));
            }
            prefs.edit().putString(PREFS_KEY, trimmed.toString()).apply();
        } catch (Exception ignored) {
            // A missing log entry must never stop the notification itself.
        }
    }
}
