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
 * دور هشتم — writing a real file onto the phone.
 *
 * Why this is native code rather than a plugin off the shelf:
 *
 *  * The web `<a download>` trick the app used does nothing at all inside an
 *    Android WebView — no file is ever written — yet the app announced
 *    «دانلود شد». That false success is the bug this round exists to kill, and
 *    it hit BOTH the generated pictures and, worse, the backup file: the one
 *    thing standing between the user and losing years of history.
 *  * @capacitor/filesystem cannot replace it either. Its Directory.Documents
 *    goes through the raw File API that scoped storage blocks on Android 10+,
 *    and Directory.External lands in /Android/data/<pkg>/files, where neither a
 *    gallery nor a file manager will look.
 *
 * MediaStore is the only route that puts a file somewhere the user can actually
 * find on a modern Android, and it needs NO runtime permission from Android 10
 * (API 29) onwards. Below that it falls back to the public Pictures/Downloads
 * directories, which do need WRITE_EXTERNAL_STORAGE.
 *
 * Every failure path rejects the call with a real reason. Nothing here ever
 * reports success it did not achieve.
 */
@CapacitorPlugin(
    name = "FileSaver",
    permissions = {
        @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "storage")
    }
)
public class FileSaverPlugin extends Plugin {

    private static final String ALBUM = "ذکرآرام";

    // ── public API ────────────────────────────────────────────────────────

    /** A picture, into the phone's gallery (Pictures/ذکرآرام). */
    @PluginMethod
    public void saveImageToGallery(PluginCall call) {
        call.getData().put("kind", "image");
        start(call);
    }

    /** Any other file — the backup above all — into the Downloads folder. */
    @PluginMethod
    public void saveFileToDownloads(PluginCall call) {
        call.getData().put("kind", "download");
        start(call);
    }

    // ── permission gate ───────────────────────────────────────────────────

    private void start(PluginCall call) {
        // From Android 10 the app owns what it inserts into MediaStore, so no
        // permission is involved. Only the legacy path has to ask.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
            && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermissionCallback");
            return;
        }
        perform(call);
    }

    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        if (getPermissionState("storage") != PermissionState.GRANTED) {
            call.reject("PERMISSION_DENIED");
            return;
        }
        perform(call);
    }

    // ── the work ──────────────────────────────────────────────────────────

    private void perform(PluginCall call) {
        String data = call.getString("data");
        String fileName = call.getString("fileName", "zekraram");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        boolean isImage = "image".equals(call.getString("kind"));

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
            call.reject("EMPTY_FILE");
            return;
        }

        try {
            String uri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                uri = isImage
                    ? viaMediaStore(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, fileName, mimeType,
                        Environment.DIRECTORY_PICTURES + File.separator + ALBUM, bytes)
                    : viaMediaStore(MediaStore.Downloads.EXTERNAL_CONTENT_URI, fileName, mimeType,
                        Environment.DIRECTORY_DOWNLOADS, bytes);
            } else {
                uri = isImage
                    ? toPublicDir(Environment.DIRECTORY_PICTURES, ALBUM, fileName, bytes, true)
                    : toPublicDir(Environment.DIRECTORY_DOWNLOADS, null, fileName, bytes, false);
            }
            JSObject result = new JSObject();
            result.put("uri", uri);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("WRITE_FAILED: " + e.getMessage());
        }
    }

    /** Android 10+: insert through MediaStore, so the file is visible at once. */
    private String viaMediaStore(Uri collection, String fileName, String mimeType,
                                 String relativePath, byte[] bytes) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri item = resolver.insert(collection, values);
        if (item == null) throw new Exception("MediaStore refused the insert");

        try {
            OutputStream out = resolver.openOutputStream(item);
            if (out == null) throw new Exception("could not open the new entry for writing");
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
        values.put(MediaStore.MediaColumns.IS_PENDING, 0);
        resolver.update(item, values, null, null);
        return item.toString();
    }

    /** Android 9 and below: a plain file in the public Pictures/Downloads folder. */
    private String toPublicDir(String publicDir, String subFolder, String fileName,
                               byte[] bytes, boolean mediaScan) throws Exception {
        File dir = Environment.getExternalStoragePublicDirectory(publicDir);
        if (subFolder != null) dir = new File(dir, subFolder);
        if (!dir.exists() && !dir.mkdirs()) throw new Exception("could not create " + dir);

        File target = new File(dir, fileName);
        FileOutputStream out = new FileOutputStream(target);
        try {
            out.write(bytes);
            out.flush();
        } finally {
            out.close();
        }

        if (mediaScan) {
            android.content.Intent scan =
                new android.content.Intent(android.content.Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
            scan.setData(Uri.fromFile(target));
            getContext().sendBroadcast(scan);
        }
        return Uri.fromFile(target).toString();
    }
}
