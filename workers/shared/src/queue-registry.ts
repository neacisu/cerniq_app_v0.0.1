import { getRateLimitForProvider } from "./rate-limiter.js";

export type QueueConfig = {
  name: string;
  concurrency: number;
  provider?: string;
  rateLimit?: { max: number; duration: number };
};

const withProvider = (name: string, concurrency: number, provider: string): QueueConfig => ({
  name,
  concurrency,
  provider,
  rateLimit: getRateLimitForProvider(provider),
});

export const queueRegistry: QueueConfig[] = [
  // A (5)
  { name: "bronze:ingest:csv-parser", concurrency: 5 },
  { name: "bronze:ingest:excel-parser", concurrency: 3 },
  { name: "bronze:ingest:webhook", concurrency: 20 },
  { name: "bronze:ingest:manual", concurrency: 10 },
  { name: "bronze:ingest:api", concurrency: 5 },
  // B (4)
  { name: "bronze:normalize:name", concurrency: 20 },
  { name: "bronze:normalize:address", concurrency: 20 },
  { name: "bronze:normalize:phone", concurrency: 30 },
  { name: "bronze:normalize:email", concurrency: 30 },
  // C (2)
  { name: "silver:validate:cui-modulo11", concurrency: 50 },
  withProvider("silver:validate:cui-anaf", 1, "anaf"),
  // D (5)
  withProvider("silver:enrich:anaf-fiscal-status", 1, "anaf"),
  withProvider("silver:enrich:anaf-tva-status", 1, "anaf"),
  withProvider("silver:enrich:anaf-efactura", 1, "anaf"),
  withProvider("silver:enrich:anaf-datorii", 1, "anaf"),
  withProvider("silver:enrich:anaf-caen", 1, "anaf"),
  // E (4)
  withProvider("silver:enrich:termene-balance", 10, "termene"),
  withProvider("silver:enrich:termene-risk", 10, "termene"),
  withProvider("silver:enrich:termene-dosare", 10, "termene"),
  withProvider("silver:enrich:termene-actionari", 10, "termene"),
  // F (3)
  withProvider("silver:enrich:onrc-data", 5, "onrc"),
  withProvider("silver:enrich:onrc-administratori", 5, "onrc"),
  withProvider("silver:enrich:onrc-sedii", 5, "onrc"),
  // G (6)
  withProvider("silver:enrich:hunter-email-finder", 5, "hunter"),
  withProvider("silver:enrich:hunter-verifier", 5, "hunter"),
  withProvider("silver:enrich:zerobounce-validation", 10, "zerobounce"),
  { name: "silver:enrich:email-enricher", concurrency: 5 },
  { name: "silver:enrich:email-pattern", concurrency: 5 },
  { name: "silver:enrich:email-generator", concurrency: 5 },
  // H (3)
  { name: "silver:enrich:phone-normalizer", concurrency: 20 },
  withProvider("silver:enrich:hlr-lookup", 5, "hlr"),
  { name: "silver:enrich:carrier-detection", concurrency: 20 },
  // I (4)
  withProvider("silver:enrich:daj-scraper", 2, "scraping"),
  withProvider("silver:enrich:anif-scraper", 2, "scraping"),
  { name: "silver:enrich:website-finder", concurrency: 5 },
  { name: "silver:enrich:contact-page-scraper", concurrency: 3 },
  // J (4)
  withProvider("silver:enrich:grok-structuring", 5, "xai"),
  withProvider("silver:enrich:ai-data-merger", 5, "xai"),
  { name: "silver:enrich:ai-confidence-scorer", concurrency: 10 },
  { name: "silver:enrich:ai-fallback", concurrency: 3 },
  // K (3)
  withProvider("silver:enrich:nominatim-geocoding", 1, "nominatim"),
  { name: "silver:enrich:postgis-zones", concurrency: 10 },
  { name: "silver:enrich:proximity-calculator", concurrency: 10 },
  // L (5)
  withProvider("silver:enrich:apia-data", 2, "scraping"),
  { name: "silver:enrich:ouai-membership", concurrency: 5 },
  { name: "silver:enrich:cooperative-membership", concurrency: 5 },
  { name: "silver:enrich:culturi-classifier", concurrency: 10 },
  { name: "silver:enrich:animale-classifier", concurrency: 10 },
  // M (2)
  { name: "silver:dedup:exact-hash", concurrency: 10 },
  { name: "silver:dedup:fuzzy-match", concurrency: 5 },
  // N (3)
  { name: "silver:score:completeness", concurrency: 20 },
  { name: "silver:score:accuracy", concurrency: 20 },
  { name: "silver:score:freshness", concurrency: 20 },
  // O (2)
  { name: "silver:aggregate:daily-stats", concurrency: 1 },
  { name: "silver:aggregate:quality-rollup", concurrency: 10 },
  // P (7 — orchestrate, promote-to-gold, promote-bronze-silver, monitor, error-handler, hitl-escalation, hitl-resume)
  { name: "pipeline:orchestrate", concurrency: 20 },
  { name: "pipeline:promote-to-gold", concurrency: 10 },
  { name: "pipeline:promote-bronze-silver", concurrency: 10 },
  { name: "pipeline:monitor", concurrency: 1 },
  { name: "pipeline:error-handler", concurrency: 10 },
  { name: "pipeline:hitl-escalation", concurrency: 5 },
  { name: "pipeline:hitl-resume-after-approval", concurrency: 10 },
];

export function getQueueConfig(name: string): QueueConfig | undefined {
  return queueRegistry.find((q) => q.name === name);
}

export function assertQueueRegistryComplete() {
  if (queueRegistry.length !== 62) {
    throw new Error(`Expected 62 queues, got ${queueRegistry.length}`);
  }
}
