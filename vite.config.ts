import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig(async () => {
const isReplit = process.env.REPL_ID !== undefined;
const isProd = process.env.NODE_ENV === "production";

const plugins: any[] = [react(), runtimeErrorOverlay(), metaImagesPlugin()];

// Replit-only dev helpers
if (!isProd && isReplit) {
const { cartographer } = await import("@replit/vite-plugin-cartographer");
const { devBanner } = await import("@replit/vite-plugin-dev-banner");
plugins.push(cartographer(), devBanner());
}

return {
plugins,
resolve: {
alias: {
"@": path.resolve(import.meta.dirname, "client", "src"),
"@shared": path.resolve(import.meta.dirname, "shared"),
"@assets": path.resolve(import.meta.dirname, "attached_assets"),
},
},
root: path.resolve(import.meta.dirname, "client"),
build: {
outDir: path.resolve(import.meta.dirname, "public"),
emptyOutDir: true,
},
server: {
host: "0.0.0.0",
port: 5000,
allowedHosts: true,

// Replit file watcher limits fix (ENOSPC)
watch: {
usePolling: true,
interval: 250,
ignored: ["**/.cache/**", "**/node_modules/**", "**/.git/**"],
},

fs: {
strict: true,
deny: ["**/.*"],
},
},
};
});

