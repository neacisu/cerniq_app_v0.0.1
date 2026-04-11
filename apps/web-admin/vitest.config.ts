import { defineConfig } from "vitest/config";
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Vitest 4 / jsdom: evită warning `--localstorage-file` fără path. */
const nodeLocalStorageBacking = path.join(tmpdir(), "cerniq-web-admin-vitest-localstorage");
if (!existsSync(nodeLocalStorageBacking)) {
  writeFileSync(nodeLocalStorageBacking, "");
}

/** Suprafața Tier B măsurată — vezi `docs/developer-guide/testing-coverage-tiers.json` (@cerniq/web-admin). */
const coverageInclude = [
  "src/api.ts",
  "src/lib/report-client-error.ts",
  "src/pages/Dashboard.tsx",
  "src/pages/Login.tsx",
  "src/pages/Logs.tsx",
  "src/pages/Queues.tsx",
];

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    /** Fișierele partajează același `jsdom` / Storage; paralelism între fișiere rupe izolarea `localStorage`. */
    fileParallelism: false,
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    css: true,
    execArgv: [`--localstorage-file=${nodeLocalStorageBacking}`],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: coverageInclude,
      exclude: ["**/get-api-base.ts", "**/admin-session-correlation.ts"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
