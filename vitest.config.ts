import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: true,
    environment: "node",
    testTimeout: 60000,
    hookTimeout: 30000,
    reporters: ["default", "verbose"],
    watch: false,
    printConsoleTrace: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
    },
  },
});
