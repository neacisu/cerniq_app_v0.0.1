import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
    globals: true,
    /**
     * Procesori BullMQ în `src/workers/` — acoperire exhaustivă = suite dedicată;
     * pragul se aplică pe stratul rămas (lib, bootstrap, orchestrare).
     */
    coverage: {
      provider: "v8",
      exclude: ["**/node_modules/**", "**/dist/**", "src/workers/**"],
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: {
        statements: 55,
        branches: 50,
        functions: 50,
        lines: 55,
      },
    },
  },
});
