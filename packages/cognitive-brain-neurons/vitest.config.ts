import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/index.ts",
        "src/neurons/e1/bronze-ingest-csv-parser/manifest.ts",
        "src/neurons/e1/bronze-ingest-csv-parser/bronze-ingest-csv-parser-handler.ts",
        "src/neurons/e1/bronze-ingest-csv-parser/synapses/normalization-queues.ts",
      ],
      exclude: ["**/*.test.ts"],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
