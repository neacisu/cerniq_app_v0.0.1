import path from "node:path";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vite";
import { manualChunkForModuleId } from "./vite.manual-chunks";

// React Compiler (Babel) must not run on the dev transform graph: @rolldown/plugin-babel
// can process Vite virtual modules (e.g. /@react-refresh) and break Rolldown with
// "Missing field `moduleType`" → 500 on /@vite/client and HMR. Production builds keep the compiler.
export default defineConfig(
  ({ command }): UserConfig => ({
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
  }),
);
