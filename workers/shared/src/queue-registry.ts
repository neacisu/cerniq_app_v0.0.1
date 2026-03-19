import { getRateLimitForProvider } from "./rate-limiter.js";

export type QueueConfig = {
  name: string;
  concurrency: number;
  provider?: string;
  rateLimit?: { max: number; duration: number };
};

export const QUEUE_NAME_PATTERN = /^[a-z0-9]+(?::[a-z0-9-]+){1,3}$/;

export const QUEUES = {
  INGEST_CSV: "ingest:csv",
  INGEST_EXCEL: "ingest:excel",
  INGEST_WEBHOOK: "ingest:webhook",
  INGEST_MANUAL: "ingest:manual",
  INGEST_API: "ingest:api",
  NORMALIZE_NAME: "normalize:name",
  NORMALIZE_ADDRESS: "normalize:address",
  NORMALIZE_PHONE: "normalize:phone",
  NORMALIZE_EMAIL: "normalize:email",
  ENRICH_BRONZE_ANAF: "enrich:bronze:anaf",
  VALIDATE_CUI_MOD11: "validate:cui:mod11",
  VALIDATE_CUI_ANAF: "validate:cui:anaf",
  ENRICH_ANAF_FISCAL_STATUS: "enrich:anaf:fiscal-status",
  ENRICH_ANAF_TVA_STATUS: "enrich:anaf:tva-status",
  ENRICH_ANAF_EFACTURA: "enrich:anaf:efactura",
  ENRICH_ANAF_DATORII: "enrich:anaf:datorii",
  ENRICH_ANAF_CAEN: "enrich:anaf:caen",
  ENRICH_TERMENE_BALANCE: "enrich:termene:balance",
  ENRICH_TERMENE_RISK: "enrich:termene:risk",
  ENRICH_TERMENE_DOSARE: "enrich:termene:dosare",
  ENRICH_TERMENE_ACTIONARI: "enrich:termene:actionari",
  ENRICH_ONRC_DATA: "enrich:onrc:data",
  ENRICH_ONRC_ADMINISTRATORI: "enrich:onrc:administratori",
  ENRICH_ONRC_SEDII: "enrich:onrc:sedii",
  DISCOVER_EMAIL_HUNTER: "discover:email:hunter",
  DISCOVER_EMAIL_HUNTER_VERIFY: "discover:email:hunter-verify",
  DISCOVER_EMAIL_ZEROBOUNCE: "discover:email:zerobounce",
  ENRICH_EMAIL_ENRICHER: "enrich:email:enricher",
  DISCOVER_EMAIL_PATTERN: "discover:email:pattern",
  DISCOVER_EMAIL_GENERATE: "discover:email:generate",
  ENRICH_PHONE_NORMALIZE: "enrich:phone:normalize",
  ENRICH_PHONE_HLR: "enrich:phone:hlr",
  ENRICH_PHONE_CARRIER: "enrich:phone:carrier",
  SCRAPE_LEGAL_DAJ: "scrape:legal:daj",
  SCRAPE_LEGAL_ANIF: "scrape:legal:anif",
  SCRAPE_WEBSITE_FINDER: "scrape:website:finder",
  SCRAPE_WEBSITE_CONTACT_PAGE: "scrape:website:contact-page",
  AI_STRUCTURE_XAI: "ai:structure:xai",
  AI_MERGE_XAI: "ai:merge:xai",
  AI_SCORE_CONFIDENCE: "ai:score:confidence",
  AI_FALLBACK: "ai:fallback",
  GEO_GEOCODE_NOMINATIM: "geo:geocode:nominatim",
  GEO_ZONES_POSTGIS: "geo:zones:postgis",
  GEO_PROXIMITY: "geo:proximity",
  AGRI_APIA: "agri:apia",
  AGRI_OUAI: "agri:ouai",
  AGRI_COOPERATIVE: "agri:cooperative",
  AGRI_CULTURI: "agri:culturi",
  AGRI_ANIMALE: "agri:animale",
  DEDUP_EXACT: "dedup:exact",
  DEDUP_FUZZY: "dedup:fuzzy",
  SCORE_COMPLETENESS: "score:completeness",
  SCORE_ACCURACY: "score:accuracy",
  SCORE_FRESHNESS: "score:freshness",
  AGGREGATE_DAILY_STATS: "aggregate:daily-stats",
  AGGREGATE_QUALITY_ROLLUP: "aggregate:quality-rollup",
  PIPELINE_ORCHESTRATE: "pipeline:orchestrate",
  PIPELINE_PROMOTE_TO_GOLD: "pipeline:promote:gold",
  PIPELINE_PROMOTE_BRONZE_SILVER: "pipeline:promote:bronze-silver",
  PIPELINE_MONITOR: "pipeline:monitor",
  PIPELINE_ERROR_HANDLER: "pipeline:error-handler",
  HITL_ESCALATION: "hitl:escalate",
  HITL_RESUME_AFTER_APPROVAL: "hitl:resume",
} as const;

const withProvider = (name: string, concurrency: number, provider: string): QueueConfig => ({
  name,
  concurrency,
  provider,
  rateLimit: getRateLimitForProvider(provider),
});

export const queueRegistry: QueueConfig[] = [
  // A (5)
  { name: QUEUES.INGEST_CSV, concurrency: 5 },
  { name: QUEUES.INGEST_EXCEL, concurrency: 3 },
  { name: QUEUES.INGEST_WEBHOOK, concurrency: 20 },
  { name: QUEUES.INGEST_MANUAL, concurrency: 10 },
  { name: QUEUES.INGEST_API, concurrency: 5 },
  // B (4)
  { name: QUEUES.NORMALIZE_NAME, concurrency: 20 },
  { name: QUEUES.NORMALIZE_ADDRESS, concurrency: 20 },
  { name: QUEUES.NORMALIZE_PHONE, concurrency: 30 },
  { name: QUEUES.NORMALIZE_EMAIL, concurrency: 30 },
  // B5 (1)
  withProvider(QUEUES.ENRICH_BRONZE_ANAF, 1, "anaf"),
  // C (2)
  { name: QUEUES.VALIDATE_CUI_MOD11, concurrency: 50 },
  withProvider(QUEUES.VALIDATE_CUI_ANAF, 1, "anaf"),
  // D (5)
  withProvider(QUEUES.ENRICH_ANAF_FISCAL_STATUS, 1, "anaf"),
  withProvider(QUEUES.ENRICH_ANAF_TVA_STATUS, 1, "anaf"),
  withProvider(QUEUES.ENRICH_ANAF_EFACTURA, 1, "anaf"),
  withProvider(QUEUES.ENRICH_ANAF_DATORII, 1, "anaf"),
  withProvider(QUEUES.ENRICH_ANAF_CAEN, 1, "anaf"),
  // E (4)
  withProvider(QUEUES.ENRICH_TERMENE_BALANCE, 10, "termene"),
  withProvider(QUEUES.ENRICH_TERMENE_RISK, 10, "termene"),
  withProvider(QUEUES.ENRICH_TERMENE_DOSARE, 10, "termene"),
  withProvider(QUEUES.ENRICH_TERMENE_ACTIONARI, 10, "termene"),
  // F (3)
  withProvider(QUEUES.ENRICH_ONRC_DATA, 5, "onrc"),
  withProvider(QUEUES.ENRICH_ONRC_ADMINISTRATORI, 5, "onrc"),
  withProvider(QUEUES.ENRICH_ONRC_SEDII, 5, "onrc"),
  // G (6)
  withProvider(QUEUES.DISCOVER_EMAIL_HUNTER, 5, "hunter"),
  withProvider(QUEUES.DISCOVER_EMAIL_HUNTER_VERIFY, 5, "hunter"),
  withProvider(QUEUES.DISCOVER_EMAIL_ZEROBOUNCE, 10, "zerobounce"),
  { name: QUEUES.ENRICH_EMAIL_ENRICHER, concurrency: 5 },
  { name: QUEUES.DISCOVER_EMAIL_PATTERN, concurrency: 5 },
  { name: QUEUES.DISCOVER_EMAIL_GENERATE, concurrency: 5 },
  // H (3)
  { name: QUEUES.ENRICH_PHONE_NORMALIZE, concurrency: 20 },
  withProvider(QUEUES.ENRICH_PHONE_HLR, 5, "hlr"),
  { name: QUEUES.ENRICH_PHONE_CARRIER, concurrency: 20 },
  // I (4)
  withProvider(QUEUES.SCRAPE_LEGAL_DAJ, 2, "scraping"),
  withProvider(QUEUES.SCRAPE_LEGAL_ANIF, 2, "scraping"),
  { name: QUEUES.SCRAPE_WEBSITE_FINDER, concurrency: 5 },
  { name: QUEUES.SCRAPE_WEBSITE_CONTACT_PAGE, concurrency: 3 },
  // J (4)
  withProvider(QUEUES.AI_STRUCTURE_XAI, 5, "xai"),
  withProvider(QUEUES.AI_MERGE_XAI, 5, "xai"),
  { name: QUEUES.AI_SCORE_CONFIDENCE, concurrency: 10 },
  { name: QUEUES.AI_FALLBACK, concurrency: 3 },
  // K (3)
  withProvider(QUEUES.GEO_GEOCODE_NOMINATIM, 1, "nominatim"),
  { name: QUEUES.GEO_ZONES_POSTGIS, concurrency: 10 },
  { name: QUEUES.GEO_PROXIMITY, concurrency: 10 },
  // L (5)
  withProvider(QUEUES.AGRI_APIA, 2, "scraping"),
  { name: QUEUES.AGRI_OUAI, concurrency: 5 },
  { name: QUEUES.AGRI_COOPERATIVE, concurrency: 5 },
  { name: QUEUES.AGRI_CULTURI, concurrency: 10 },
  { name: QUEUES.AGRI_ANIMALE, concurrency: 10 },
  // M (2)
  { name: QUEUES.DEDUP_EXACT, concurrency: 10 },
  { name: QUEUES.DEDUP_FUZZY, concurrency: 5 },
  // N (3)
  { name: QUEUES.SCORE_COMPLETENESS, concurrency: 20 },
  { name: QUEUES.SCORE_ACCURACY, concurrency: 20 },
  { name: QUEUES.SCORE_FRESHNESS, concurrency: 20 },
  // O (2)
  { name: QUEUES.AGGREGATE_DAILY_STATS, concurrency: 1 },
  { name: QUEUES.AGGREGATE_QUALITY_ROLLUP, concurrency: 10 },
  // P (7 — orchestrate, promote-to-gold, promote-bronze-silver, monitor, error-handler, hitl-escalation, hitl-resume)
  { name: QUEUES.PIPELINE_ORCHESTRATE, concurrency: 20 },
  { name: QUEUES.PIPELINE_PROMOTE_TO_GOLD, concurrency: 10 },
  { name: QUEUES.PIPELINE_PROMOTE_BRONZE_SILVER, concurrency: 1 },
  { name: QUEUES.PIPELINE_MONITOR, concurrency: 1 },
  { name: QUEUES.PIPELINE_ERROR_HANDLER, concurrency: 10 },
  { name: QUEUES.HITL_ESCALATION, concurrency: 5 },
  { name: QUEUES.HITL_RESUME_AFTER_APPROVAL, concurrency: 10 },
];

export const queueNameSet = new Set(queueRegistry.map((queue) => queue.name));

export function getQueueConfig(name: string): QueueConfig | undefined {
  return queueRegistry.find((q) => q.name === name);
}

export function isKnownQueueName(name: string): boolean {
  return QUEUE_NAME_PATTERN.test(name) && queueNameSet.has(name);
}

export function assertQueueRegistryComplete() {
  if (queueRegistry.length !== 63) {
    throw new Error(`Expected 63 queues, got ${queueRegistry.length}`);
  }
}

/**
 * Standard retry strategies for BullMQ job options.
 * Use these across all workers for consistent retry behavior.
 */
export const RETRY_STRATEGIES = {
  /** Fast internal operations: 3 attempts, exponential 500ms base */
  FAST: {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 500 },
    removeOnFail: { count: 100 },
    removeOnComplete: { count: 100 },
  },
  /** External API calls: 5 attempts, exponential 1000ms base (up to ~16s last retry) */
  EXTERNAL_API: {
    attempts: 5,
    backoff: { type: "exponential" as const, delay: 1000 },
    removeOnFail: { count: 100 },
    removeOnComplete: { count: 100 },
  },
  /** Scraping / slow external: 3 attempts, exponential 5000ms base */
  SCRAPING: {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 5000 },
    removeOnFail: { count: 50 },
    removeOnComplete: { count: 50 },
  },
  /** Pipeline control flow: 2 attempts, fixed 1000ms (fail fast if orchestration breaks) */
  PIPELINE: {
    attempts: 2,
    backoff: { type: "fixed" as const, delay: 1000 },
    removeOnFail: { count: 200 },
    removeOnComplete: { count: 200 },
  },
  /** HITL tasks: 1 attempt (no auto retry – human decision required) */
  HITL: {
    attempts: 1,
    removeOnFail: { count: 200 },
    removeOnComplete: { count: 200 },
  },
} as const;
