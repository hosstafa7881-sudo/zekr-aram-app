package com.zekraram.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.database.Cursor;
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
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * دور هشتم / نهم — writing a real file onto the phone, and PROVING it landed.
 *
 * Why this is native code rather than a plugin off the shelf:
 *
 *  * The web `<a download>` trick the app used does nothing at all inside an
 *    Android WebView — no file is ever written — yet the app announced
 *    «دانلود شد». That false success is the bug this code exists to kill, and
 *    it hit BOTH the generated pictures and, worse, the backup file: the one
 *    thing standing between the user and losing years of history.
 *  * @capacitor/filesystem cannot replace it either. Its Directory.Documents
 *    goes through the raw File API that scoped storage blocks on Android 10+,
 *    and Directory.External lands in /Android/data/<pkg>/files, where neither a
 *    gallery nor a file manager will look.
 *
 * دور نهم — the picture route worked on the user's phone but the backup route
 * still reported success with no file in Downloads. Two things were wrong with
 * the old version, and both are the same mistake in different clothes:
 *
 *  1. It trusted `insert()` + `write()` + `update()` without ever checking that
 *     the entry really became a visible, complete file. Clearing IS_PENDING can
 *     affect zero rows, and a still-pending entry is INVISIBLE to the user and
 *     gets swept away by the system a week later. That is indistinguishable
 *     from "nothing was saved", and the old code called it success.
 *  2. It had exactly one route. When an OEM's media provider refuses
 *     MediaStore.Downloads — which some MIUI builds do — there was nothing else
 *     to try.
 *
 * So now: every route is verified by reading the bytes back, and there are
 * three routes tried in order. Nothing here reports success it did not achieve,
 * and every failure carries the real reason so it can be diagnosed from a
 * screenshot of the phone.
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
        String fileName = sanitise(call.getString("fileName", "zekraram"));
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

        // Every attempt records why it failed, so a phone that still refuses to
        // save tells us exactly which door was shut rather than just "failed".
        List<String> tried = new ArrayList<>();
        Saved saved = isImage ? saveImage(fileName, mimeType, bytes, tried)
                              : saveDownload(fileName, mimeType, bytes, tried);

        if (saved == null) {
            call.reject("WRITE_FAILED: " + join(tried));
            return;
        }

        JSObject result = new JSObject();
        result.put("uri", saved.uri);
        result.put("location", saved.location);
        call.resolve(result);
    }

    /** What a successful save gives back: the content URI and a human-readable place. */
    private static class Saved {
        final String uri;
        final String location;
        Saved(String uri, String location) { this.uri = uri; this.location = location; }
    }

    // ── routes ────────────────────────────────────────────────────────────

    private Saved saveImage(String fileName, String mimeType, byte[] bytes, List<String> tried) {
        String album = Environment.DIRECTORY_PICTURES + File.separator + ALBUM;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            Saved s = viaMediaStore(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                fileName, mimeType, album, bytes, tried, "Pictures/" + ALBUM);
            if (s != null) return s;
        }
        return viaPublicDir(Environment.DIRECTORY_PICTURES, ALBUM, fileName, bytes, true, tried);
    }

    private Saved saveDownload(String fileName, String mimeType, byte[] bytes, List<String> tried) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Route 1 — the proper Downloads collection.
            Saved s = viaMediaStore(MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                fileName, mimeType, Environment.DIRECTORY_DOWNLOADS, bytes, tried, "Download");
            if (s != null) return s;

            // Route 2 — the same folder through the generic Files collection.
            // Some OEM media providers accept this when they refuse Downloads,
            // and some refuse an unfamiliar MIME type, so this retry also
            // relaxes it to a type every provider knows.
            s = viaMediaStore(MediaStore.Files.getContentUri("external"),
                fileName, "application/octet-stream", Environment.DIRECTORY_DOWNLOADS,
                bytes, tried, "Download");
            if (s != null) return s;
        }

        // Route 3 — the plain old public Downloads folder. Legacy Android needs
        // it; on newer Android it still works for the app's own new files and
        // is the last thing standing between the user and a lost backup.
        return viaPublicDir(Environment.DIRECTORY_DOWNLOADS, null, fileName, bytes, false, tried);
    }

    /** Android 10+: insert through MediaStore, then read it back to be sure. */
    private Saved viaMediaStore(Uri collection, String fileName, String mimeType,
                                String relativePath, byte[] bytes,
                                List<String> tried, String humanPath) {
        ContentResolver resolver = getContext().getContentResolver();
        Uri item = null;
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath);
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);

            item = resolver.insert(collection, values);
            if (item == null) {
                tried.add("insert refused (" + relativePath + ")");
                return null;
            }

            OutputStream out = resolver.openOutputStream(item);
            if (out == null) throw new Exception("no output stream");
            try {
                out.write(bytes);
                out.flush();
            } finally {
                out.close();
            }

            // Publish it. A row count of zero here means the entry stays
            // PENDING — invisible to the user and deleted by the system within
            // a week. The old code never looked, which is exactly how the app
            // came to say «ذخیره شد» about a file nobody could find.
            ContentValues publish = new ContentValues();
            publish.put(MediaStore.MediaColumns.IS_PENDING, 0);
            if (resolver.update(item, publish, null, null) < 1) {
                throw new Exception("stayed pending");
            }

            // And prove it: read the bytes back out of the media store.
            int readable = readableSize(resolver, item);
            if (readable != bytes.length) {
                throw new Exception("wrote " + bytes.length + " bytes, read back " + readable);
            }

            return new Saved(item.toString(), humanPath + File.separator + displayName(resolver, item, fileName));
        } catch (Exception e) {
            if (item != null) {
                try { resolver.delete(item, null, null); } catch (Exception ignored) { }
            }
            tried.add("mediastore " + relativePath + ": " + e.getMessage());
            return null;
        }
    }

    /** A plain file in the public Pictures/Downloads folder, verified by re-reading it. */
    private Saved viaPublicDir(String publicDir, String subFolder, String fileName,
                               byte[] bytes, boolean mediaScan, List<String> tried) {
        File target = null;
        try {
            File dir = Environment.getExternalStoragePublicDirectory(publicDir);
            if (subFolder != null) dir = new File(dir, subFolder);
            if (!dir.exists() && !dir.mkdirs()) throw new Exception("could not create " + dir);

            target = new File(dir, fileName);
            FileOutputStream out = new FileOutputStream(target);
            try {
                out.write(bytes);
                out.flush();
                out.getFD().sync();
            } finally {
                out.close();
            }

            if (!target.exists() || target.length() != bytes.length) {
                throw new Exception("wrote " + bytes.length + " bytes, file is " + target.length());
            }

            if (mediaScan) {
                android.content.Intent scan =
                    new android.content.Intent(android.content.Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
                scan.setData(Uri.fromFile(target));
                getContext().sendBroadcast(scan);
            }

            String human = publicDir + (subFolder != null ? File.separator + subFolder : "")
                + File.separator + fileName;
            return new Saved(Uri.fromFile(target).toString(), human);
        } catch (Exception e) {
            if (target != null && target.exists() && target.length() == 0) {
                //noinspection ResultOfMethodCallIgnored
                target.delete();
            }
            tried.add("public " + publicDir + ": " + e.getMessage());
            return null;
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────

    /** How many bytes can actually be read back out of the saved entry. */
    private int readableSize(ContentResolver resolver, Uri item) throws Exception {
        InputStream in = resolver.openInputStream(item);
        if (in == null) throw new Exception("cannot be read back");
        try {
            int total = 0;
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) total += n;
            return total;
        } finally {
            in.close();
        }
    }

    /** The name MediaStore settled on — it appends "(1)" when a name is taken. */
    private String displayName(ContentResolver resolver, Uri item, String fallback) {
        Cursor c = null;
        try {
            c = resolver.query(item, new String[] { MediaStore.MediaColumns.DISPLAY_NAME },
                null, null, null);
            if (c != null && c.moveToFirst()) {
                String name = c.getString(0);
                if (name != null && name.length() > 0) return name;
            }
        } catch (Exception ignored) {
        } finally {
            if (c != null) c.close();
        }
        return fallback;
    }

    /** A file name the media provider will accept without reinterpreting it. */
    private String sanitise(String name) {
        String clean = name.replaceAll("[\\\\/:*?\"<>|]", "-").trim();
        return clean.length() == 0 ? "zekraram" : clean;
    }

    private String join(List<String> parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (sb.length() > 0) sb.append(" | ");
            sb.append(p);
        }
        return sb.length() == 0 ? "no route available" : sb.toString();
    }
}
