import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/setup.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
