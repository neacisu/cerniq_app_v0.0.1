import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
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
      "/auth": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:64010",
        changeOrigin: true,
      },
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
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          refine: ["@refinedev/core"],
          ui: ["lucide-react", "sonner", "recharts"],
        },
      },
    },
  },
});
