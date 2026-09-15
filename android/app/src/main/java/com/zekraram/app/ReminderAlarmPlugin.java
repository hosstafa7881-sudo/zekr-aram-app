package com.zekraram.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * دور دهم — the daily reminder, scheduled by WALL-CLOCK time.
 *
 * THE BUG THIS EXISTS TO FIX
 *
 * The user set a reminder for ۲۱:۲۸ and it arrived at ۲۲:۲۸ — exactly one hour
 * late, every time. Not a dropped alarm: a shifted one.
 *
 * The old path built the moment in JavaScript:
 *
 *     const d = new Date(); d.setHours(hour, minute, 0, 0);
 *
 * …which turns a wall-clock time into a UTC instant using the WEBVIEW's idea of
 * the local offset, hands that instant to Android, and lets ANDROID turn it back
 * into wall-clock time using ITS idea of the offset. When the two disagree, the
 * notification fires wherever the difference lands it.
 *
 * And they do disagree here. Iran dropped daylight saving in 2022, but the
 * tzdata shipped in many ROMs — MIUI on Android 11 especially — still carries
 * the old rule, which in شهریور puts Iran an hour ahead. A current JS engine
 * inside a stale framework is exactly a one-hour error.
 *
 * (It also explains why «ارسال پیام آزمایشی» always worked: that one uses
 * `Date.now() + 800`, a duration rather than a wall-clock time, so no timezone
 * conversion is involved at all.)
 *
 * So no instant ever crosses the bridge. JavaScript sends the hour and the
 * minute; Android computes the moment with its own Calendar, in its own zone.
 * Whatever either side believes about daylight saving, ۲۱:۲۸ means ۲۱:۲۸ on the
 * clock the user is actually looking at.
 *
 * WHY setAlarmClock()
 *
 * It is the one alarm type aggressive ROMs do not defer or quietly drop,
 * because it is what a real alarm clock uses and the user asked for it. That
 * was the suspicion before the hour offset was found; keeping it costs nothing
 * and removes the doubt.
 */
@CapacitorPlugin(name = "ReminderAlarm")
public class ReminderAlarmPlugin extends Plugin {

    /** Kept apart from the Capacitor plugin's own ids so neither cancels the other. */
    public static final int ID_BASE = 30_000;

    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray items = call.getArray("reminders");
        if (items == null) {
            call.reject("NO_REMINDERS");
            return;
        }

        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            call.reject("NO_ALARM_MANAGER");
            return;
        }

        JSArray armed = new JSArray();
        try {
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                int slot = item.getInt("slot");
                int dayOffset = item.optInt("dayOffset", 0);
                int hour = item.getInt("hour");
                int minute = item.getInt("minute");
                // Minutes from now, for the «۲ دقیقه بعد» test — wall clock is
                // the wrong tool for "shortly", exactly as it was for the test
                // notification that always worked.
                int inMinutes = item.optInt("inMinutes", -1);

                long at = inMinutes >= 0
                    ? System.currentTimeMillis() + inMinutes * 60_000L
                    : wallClockMillis(dayOffset, hour, minute);

                if (at <= System.currentTimeMillis() + 1000L) continue;

                int id = ID_BASE + slot;
                Intent intent = new Intent(getContext(), ReminderAlarmReceiver.class);
                intent.setAction(ReminderAlarmReceiver.ACTION_FIRE);
                intent.putExtra(ReminderAlarmReceiver.EXTRA_ID, id);
                intent.putExtra(ReminderAlarmReceiver.EXTRA_TITLE, item.optString("title", "ذکرآرام"));
                intent.putExtra(ReminderAlarmReceiver.EXTRA_BODY, item.optString("body", ""));
                intent.putExtra(ReminderAlarmReceiver.EXTRA_CHANNEL, item.optString("channelId", ""));

                PendingIntent pending = broadcast(id, intent, true);
                PendingIntent show = PendingIntent.getActivity(
                    getContext(), id,
                    new Intent(getContext(), MainActivity.class),
                    pendingFlags(false)
                );
                alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), pending);

                JSObject one = new JSObject();
                one.put("id", id);
                one.put("at", at);
                armed.put(one);
            }
        } catch (Exception e) {
            call.reject("SCHEDULE_FAILED: " + e.getMessage());
            return;
        }

        JSObject result = new JSObject();
        result.put("armed", armed);
        call.resolve(result);
    }

    /** Cancels every alarm this plugin owns, up to `count` slots. */
    @PluginMethod
    public void cancelAll(PluginCall call) {
        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            call.resolve();
            return;
        }
        int from = call.getInt("from", 0);
        int count = call.getInt("count", 64);
        for (int slot = from; slot < from + count; slot++) {
            int id = ID_BASE + slot;
            Intent intent = new Intent(getContext(), ReminderAlarmReceiver.class);
            intent.setAction(ReminderAlarmReceiver.ACTION_FIRE);
            // NO_CREATE: only returns something when an alarm really exists.
            PendingIntent existing = broadcast(id, intent, false);
            if (existing != null) {
                alarmManager.cancel(existing);
                existing.cancel();
            }
        }
        call.resolve();
    }

    /**
     * Which of our alarms the system is really holding right now.
     *
     * This is the honest version of the reminder-status card. The Capacitor
     * plugin's getPending() reads its own saved records, so it answers "did the
     * app write this down", not "is the phone holding an alarm" — and the card
     * built on it claimed more than it knew. A PendingIntent lookup with
     * FLAG_NO_CREATE asks the system itself.
     */
    @PluginMethod
    public void listPending(PluginCall call) {
        int from = call.getInt("from", 0);
        int count = call.getInt("count", 64);
        JSArray ids = new JSArray();
        for (int slot = from; slot < from + count; slot++) {
            int id = ID_BASE + slot;
            Intent intent = new Intent(getContext(), ReminderAlarmReceiver.class);
            intent.setAction(ReminderAlarmReceiver.ACTION_FIRE);
            if (broadcast(id, intent, false) != null) ids.put(id);
        }
        JSObject result = new JSObject();
        result.put("ids", ids);
        // The next alarm's wall-clock time, as the system scheduled it.
        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            AlarmManager.AlarmClockInfo next = alarmManager.getNextAlarmClock();
            if (next != null) result.put("nextAlarmAt", next.getTriggerTime());
        }
        call.resolve(result);
    }

    /**
     * The delivery log the receiver writes — when our reminders actually fired.
     *
     * Two rounds were lost to not being able to tell «نیامد» from «آمد و ندیدمش».
     * This is the record that separates them.
     */
    @PluginMethod
    public void deliveryLog(PluginCall call) {
        JSObject result = new JSObject();
        try {
            android.content.SharedPreferences prefs =
                getContext().getSharedPreferences(ReminderAlarmReceiver.PREFS, Context.MODE_PRIVATE);
            result.put("entries", new JSArray(prefs.getString(ReminderAlarmReceiver.PREFS_KEY, "[]")));
        } catch (Exception e) {
            result.put("entries", new JSArray());
        }
        call.resolve(result);
    }

    @PluginMethod
    public void clearDeliveryLog(PluginCall call) {
        try {
            getContext()
                .getSharedPreferences(ReminderAlarmReceiver.PREFS, Context.MODE_PRIVATE)
                .edit()
                .remove(ReminderAlarmReceiver.PREFS_KEY)
                .apply();
        } catch (Exception ignored) {
        }
        call.resolve();
    }

    // ── helpers ───────────────────────────────────────────────────────────

    /**
     * The moment `hour:minute`, `dayOffset` days from today, in the phone's own
     * timezone. This one method is the whole fix.
     */
    private long wallClockMillis(int dayOffset, int hour, int minute) {
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DAY_OF_YEAR, dayOffset);
        c.set(Calendar.HOUR_OF_DAY, hour);
        c.set(Calendar.MINUTE, minute);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    private PendingIntent broadcast(int id, Intent intent, boolean create) {
        return PendingIntent.getBroadcast(getContext(), id, intent, pendingFlags(!create));
    }

    private int pendingFlags(boolean noCreate) {
        int flags = noCreate ? PendingIntent.FLAG_NO_CREATE : PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return flags;
    }
}
