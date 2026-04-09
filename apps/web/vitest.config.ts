import { defineConfig } from "vitest/config";
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Node 22+ / MSW: acces la `localStorage` fără path valid → Warning `--localstorage-file`. */
const nodeLocalStorageBacking = path.join(tmpdir(), "cerniq-web-vitest-localstorage");
if (!existsSync(nodeLocalStorageBacking)) {
  writeFileSync(nodeLocalStorageBacking, "");
}

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.tsx", "__tests__/**/*.test.tsx", "__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/setup.ts"],
    css: true,
    /** Vitest 4: `execArgv` pentru worker-i Node (înlocuiește `poolOptions.*.execArgv`). */
    execArgv: [`--localstorage-file=${nodeLocalStorageBacking}`],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      /** Praguri anti-regresie (acoperire curentă ~49–51% pe tree-ul UI); creștere treptată spre 75%+. */
      thresholds: {
        statements: 48,
        branches: 35,
        functions: 42,
        lines: 48,
      },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
