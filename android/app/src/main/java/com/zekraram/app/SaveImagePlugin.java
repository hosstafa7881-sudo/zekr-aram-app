package com.zekraram.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * دور هشتم / مورد ۴ — «ذخیره‌ی تصویر در گالری».
 *
 * Why this is native code rather than a plugin off the shelf:
 *
 *  * The web `<a download>` trick the app used before does nothing at all
 *    inside an Android WebView — no file is ever written — yet the app showed
 *    «عکس تو گوشی دانلود شد». That false success is the bug this round exists
 *    to kill.
 *  * @capacitor/filesystem's Directory.Documents maps to the PUBLIC Documents
 *    folder through the raw File API, which scoped storage blocks on Android
 *    10+, and its Directory.External lands in
 *    /Android/data/<pkg>/files where no gallery app will ever look.
 *
 * MediaStore is the only route that actually puts a picture in the phone's
 * gallery on a modern Android, and it needs NO runtime permission from
 * Android 10 (API 29) onwards. Below that it falls back to the public
 * Pictures directory, which does need WRITE_EXTERNAL_STORAGE.
 *
 * Every failure path rejects the call with a real message. Nothing here ever
 * reports success it did not achieve.
 */
@CapacitorPlugin(
    name = "SaveImage",
    permissions = {
        @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "storage")
    }
)
public class SaveImagePlugin extends Plugin {

    private static final String ALBUM = "ذکرآرام";

    @PluginMethod
    public void saveToGallery(PluginCall call) {
        // From Android 10 the app owns what it inserts into MediaStore, so no
        // permission is involved. Only the legacy path has to ask.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
            && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermissionCallback");
            return;
        }
        performSave(call);
    }

    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        if (getPermissionState("storage") != PermissionState.GRANTED) {
            call.reject("PERMISSION_DENIED");
            return;
        }
        performSave(call);
    }

    private void performSave(PluginCall call) {
        String data = call.getString("data");
        String fileName = call.getString("fileName", "zekraram.png");
        if (data == null || data.length() == 0) {
            call.reject("NO_DATA");
            return;
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(data, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("BAD_DATA");
            return;
        }
        if (bytes.length == 0) {
            call.reject("EMPTY_IMAGE");
            return;
        }

        try {
            String uri = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ? saveViaMediaStore(fileName, bytes)
                : saveToPublicPictures(fileName, bytes);
            JSObject result = new JSObject();
            result.put("uri", uri);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("WRITE_FAILED: " + e.getMessage());
        }
    }

    /** Android 10+: insert into MediaStore so the gallery picks it up immediately. */
    private String saveViaMediaStore(String fileName, byte[] bytes) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        values.put(
            MediaStore.Images.Media.RELATIVE_PATH,
            Environment.DIRECTORY_PICTURES + File.separator + ALBUM
        );
        values.put(MediaStore.Images.Media.IS_PENDING, 1);

        Uri item = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (item == null) throw new Exception("MediaStore refused the insert");

        try {
            OutputStream out = resolver.openOutputStream(item);
            if (out == null) throw new Exception("could not open the new gallery entry");
            try {
                out.write(bytes);
                out.flush();
            } finally {
                out.close();
            }
        } catch (Exception e) {
            resolver.delete(item, null, null);
            throw e;
        }

        values.clear();
        values.put(MediaStore.Images.Media.IS_PENDING, 0);
        resolver.update(item, values, null, null);
        return item.toString();
    }

    /** Android 9 and below: a plain file in the public Pictures folder. */
    private String saveToPublicPictures(String fileName, byte[] bytes) throws Exception {
        File dir = new File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
            ALBUM
        );
        if (!dir.exists() && !dir.mkdirs()) throw new Exception("could not create the album folder");

        File target = new File(dir, fileName);
        FileOutputStream out = new FileOutputStream(target);
        try {
            out.write(bytes);
            out.flush();
        } finally {
            out.close();
        }

        // Make it visible to the gallery without waiting for a media scan.
        android.content.Intent scan =
            new android.content.Intent(android.content.Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
        scan.setData(Uri.fromFile(target));
        getContext().sendBroadcast(scan);

        return Uri.fromFile(target).toString();
    }
}
