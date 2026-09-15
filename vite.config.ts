import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    // دور هشتم — big enough to swallow the six Vazirmatn weights (~51 KB each).
    // viteSingleFile inlines the CSS, but a font referenced by url() is only
    // base64-inlined when it is under this limit; above it, the build emits a
    // separate file the single-file APK bundle would never load. Keeping the
    // font INSIDE the bundle is what makes the app work with no network, which
    // it must: it is offline-first and published in Iran, where Google's font
    // servers are not dependable.
    assetsInlineLimit: 600 * 1024,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
