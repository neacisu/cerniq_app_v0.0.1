import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Doar componentele task `ui-missing-e1-e2` — prag 100% pe aceste fișiere. */
const UI_MISSING_E1_E2 = [
  "src/components/etapa1/EnrichmentProviderStatus.tsx",
  "src/components/etapa1/DataQualityScorecard.tsx",
  "src/components/etapa1/DeduplicationReview.tsx",
  "src/components/outreach/analytics/CampaignAnalytics.tsx",
  "src/components/outreach/phones/PhoneReputationDashboard.tsx",
  "src/components/outreach/sequences/SequenceTimeline.tsx",
].map((f) => path.resolve(__dirname, f));

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        include: UI_MISSING_E1_E2,
        thresholds: {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  }),
);
