import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

function devWatchOptions(): { usePolling: boolean; interval?: number } | undefined {
  const poll =
    process.env.CHOKIDAR_USEPOLLING === "true" ||
    process.env.VITE_USE_POLLING === "true" ||
    process.env.WATCHPACK_POLLING === "true";
  if (!poll) return undefined;
  const raw = process.env.CHOKIDAR_INTERVAL ?? process.env.VITE_POLL_INTERVAL ?? "300";
  const interval = Number(raw);
  return { usePolling: true, interval: Number.isFinite(interval) ? interval : 300 };
}

function devHmrOptions():
  | boolean
  | {
      host: string;
      protocol: "ws" | "wss";
      clientPort: number;
      path?: string;
    } {
  const host = process.env.VITE_HMR_CLIENT_HOST?.trim();
  if (!host) return true;
  const protocol: "ws" | "wss" = process.env.VITE_HMR_PROTOCOL === "ws" ? "ws" : "wss";
  const portRaw = process.env.VITE_HMR_CLIENT_PORT ?? "443";
  const clientPort = Number(portRaw);
  const pathSeg = process.env.VITE_HMR_PATH?.trim();
  return {
    host,
    protocol,
    clientPort: Number.isFinite(clientPort) ? clientPort : 443,
    ...(pathSeg ? { path: pathSeg } : {}),
  };
}

const watchOpts = devWatchOptions();
const hmrOpts = devHmrOptions();

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 64012,
    host: true,
    allowedHosts: ["dev.cerniq.app", "localhost"],
    ...(watchOpts ? { watch: watchOpts } : {}),
    ...(hmrOpts === true ? {} : { hmr: hmrOpts }),
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:64010",
        changeOrigin: true,
      },
      "/health": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:64010",
        changeOrigin: true,
      },
      "/metrics": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:64010",
        changeOrigin: true,
      },
    },
  },
  build: { target: "esnext" },
});
