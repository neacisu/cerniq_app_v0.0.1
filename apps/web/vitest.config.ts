import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: [
      "src/**/*.test.tsx",
      "__tests__/**/*.test.tsx",
      "__tests__/**/*.test.ts",
    ],
    setupFiles: ["__tests__/setup.ts"],
    css: true,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
