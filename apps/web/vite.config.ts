import path from "node:path";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vite";
import { manualChunkForModuleId } from "./vite.manual-chunks";

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

// React Compiler (Babel) must not run on the dev transform graph: @rolldown/plugin-babel
// can process Vite virtual modules (e.g. /@react-refresh) and break Rolldown with
// "Missing field `moduleType`" → 500 on /@vite/client and HMR. Production builds keep the compiler.
export default defineConfig(({ command }): UserConfig => {
  const watchOpts = devWatchOptions();
  const hmrOpts = devHmrOptions();
  return {
    plugins: [
      react(),
      ...(command === "build" ? [babel({ presets: [reactCompilerPreset()] })] : []),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 64000,
      host: true,
      allowedHosts: ["dev.cerniq.app", "localhost"],
      ...(watchOpts ? { watch: watchOpts } : {}),
      ...(hmrOpts === true ? {} : { hmr: hmrOpts }),
      proxy: {
        "/health": {
          target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:64010",
          changeOrigin: true,
        },
        "/api": {
          target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:64010",
          changeOrigin: true,
        },
        "/docs": {
          target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:64010",
          changeOrigin: true,
        },
        "/metrics": {
          target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:64010",
          changeOrigin: true,
        },
      },
    },
    build: {
      target: "esnext",
      rollupOptions: {
        output: {
          manualChunks: (id: string) => manualChunkForModuleId(id),
        },
      },
    },
  };
});
