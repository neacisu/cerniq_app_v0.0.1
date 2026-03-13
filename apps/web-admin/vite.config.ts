import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 64012,
    host: true,
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
