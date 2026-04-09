import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { manualChunkForModuleId } from "./vite.manual-chunks";

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
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
});
