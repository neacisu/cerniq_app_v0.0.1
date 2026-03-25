import { getRateLimitForProvider } from "./rate-limiter.js";

export type QueueConfig = {
  name: string;
  concurrency: number;
  provider?: string;
  rateLimit?: { max: number; duration: number };
};

// Updated to allow underscores (used by Etapa 2 per-phone queue names, e.g. q:wa:phone-01)
export const QUEUE_NAME_PATTERN = /^[a-z0-9]+(?::[a-z0-9_-]+){1,4}$/;

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
  ENRICH_ANAF_FULL: "enrich:anaf:full",
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
  MAINTENANCE_IMPORT_FILE_CLEANUP: "maintenance:import-file-cleanup",

  // =========================================================================
  // ETAPA 2 — Cold Outreach Multi-Canal
  // Source: etapa2-workers-overview.md sec. 3.2
  // =========================================================================

  // A — Quota Guardian (4 queues)
  QUOTA_GUARDIAN_CHECK: "quota:guardian:check",
  QUOTA_GUARDIAN_INCREMENT: "quota:guardian:increment",
  QUOTA_GUARDIAN_RESET: "quota:guardian:reset",
  QUOTA_BUSINESS_HOURS_CHECK: "quota:business-hours:check",

  // B — Orchestration (4 queues)
  OUTREACH_ORCHESTRATOR_DISPATCH: "outreach:orchestrator:dispatch",
  OUTREACH_ORCHESTRATOR_ROUTER: "outreach:orchestrator:router",
  OUTREACH_PHONE_ALLOCATOR: "outreach:phone:allocator",
  OUTREACH_CHANNEL_SELECTOR: "outreach:channel:selector",

  // C — WhatsApp non-per-phone (7 queues; per-phone generated separately)
  WA_REPLY: "q:wa:reply",
  WA_MESSAGE_RETRY: "wa:message:retry",
  WA_CHAT_HISTORY_FETCH: "wa:chat:history:fetch",
  WA_STATUS_SYNC: "wa:status:sync",
  WA_MEDIA_SEND: "wa:media:send",

  // D — Email Cold (5 queues)
  EMAIL_COLD: "q:email:cold",
  EMAIL_COLD_CAMPAIGN_CREATE: "email:cold:campaign:create",
  EMAIL_COLD_CAMPAIGN_PAUSE: "email:cold:campaign:pause",
  EMAIL_COLD_ANALYTICS_FETCH: "email:cold:analytics:fetch",
  EMAIL_COLD_LEAD_STATUS: "email:cold:lead:status",

  // E — Email Warm (3 queues)
  EMAIL_WARM: "q:email:warm",
  EMAIL_WARM_PROFORMA: "email:warm:proforma",
  EMAIL_WARM_DOCUMENT: "email:warm:document",

  // F — Template processing (3 queues)
  TEMPLATE_SPINTAX_PROCESS: "template:spintax:process",
  TEMPLATE_PERSONALIZE: "template:personalize",
  TEMPLATE_VALIDATE: "template:validate",

  // G — Webhooks (4 queues)
  WEBHOOK_TIMELINESAI_INGEST: "webhook:timelinesai:ingest",
  WEBHOOK_INSTANTLY_INGEST: "webhook:instantly:ingest",
  WEBHOOK_RESEND_INGEST: "webhook:resend:ingest",
  WEBHOOK_NORMALIZE: "webhook:normalize",

  // H — Sequences (4 queues)
  SEQUENCE_SCHEDULE_FOLLOWUP: "sequence:schedule:followup",
  SEQUENCE_STOP: "sequence:stop",
  SEQUENCE_ADVANCE: "sequence:advance",
  SEQUENCE_CREATE: "sequence:create",

  // I — Lead State Machine (3 queues)
  LEAD_STATE_TRANSITION: "lead:state:transition",
  LEAD_STATE_VALIDATE: "lead:state:validate",
  LEAD_ASSIGN_USER: "lead:assign:user",

  // J — AI (3 queues)
  AI_SENTIMENT_ANALYZE: "ai:sentiment:analyze",
  AI_RESPONSE_GENERATE: "ai:response:generate",
  AI_INTENT_CLASSIFY: "ai:intent:classify",

  // K — Monitoring & Alerts (6 queues)
  MONITOR_PHONE_HEALTH: "monitor:phone:health",
  MONITOR_EMAIL_DELIVERABILITY: "monitor:email:deliverability",
  MONITOR_QUOTA_USAGE: "monitor:quota:usage",
  ALERT_PHONE_OFFLINE: "alert:phone:offline",
  ALERT_PHONE_BANNED: "alert:phone:banned",
  ALERT_BOUNCE_HIGH: "alert:bounce:high",

  // L — HITL / Human Review (7 queues)
  HUMAN_REVIEW_QUEUE: "human:review:queue",
  HUMAN_REVIEW_ASSIGN: "human:review:assign",
  HUMAN_TAKEOVER_INITIATE: "human:takeover:initiate",
  HUMAN_TAKEOVER_COMPLETE: "human:takeover:complete",
  HUMAN_APPROVE_MESSAGE: "human:approve:message",
  HUMAN_REVIEW_ESCALATION: "human:review:escalation",
  HUMAN_REVIEW_AUDIT_LOG: "human:review:audit-log",

  // Outreach Pipeline (2 queues)
  PIPELINE_OUTREACH_HEALTH: "pipeline:outreach:health",
  PIPELINE_OUTREACH_METRICS: "pipeline:outreach:metrics",

  /** Dead letter queue — mesaje eșuate outreach (retention scurtă, alertare). */
  OUTREACH_DLQ: "dlq:outreach",
} as const;

const withProvider = (name: string, concurrency: number, provider: string): QueueConfig => ({
  name,
  concurrency,
  provider,
  rateLimit: getRateLimitForProvider(provider),
});

// =========================================================================
// Etapa 2: Generate per-phone WhatsApp queues (40 queues total)
// 20 initial queues + 20 followup queues
// ADR-0060: concurrency MUST be 1 per queue (HOL blocking prevention)
// =========================================================================
export const WA_PHONE_COUNT = 20;

/** Get queue name for a specific phone number (1-indexed) */
export function getWaPhoneQueueName(phoneIndex: number): string {
  return `q:wa:phone-${String(phoneIndex).padStart(2, "0")}`;
}

/** Get followup queue name for a specific phone number (1-indexed) */
export function getWaPhoneFollowupQueueName(phoneIndex: number): string {
  return `q:wa:phone-${String(phoneIndex).padStart(2, "0")}:followup`;
}

/** All 40 per-phone queue configs (concurrency=1 strict per ADR-0060) */
export function buildWaPhoneQueues(): QueueConfig[] {
  return Array.from({ length: WA_PHONE_COUNT }, (_, idx) => {
    const i = idx + 1;
    return [
      { name: getWaPhoneQueueName(i), concurrency: 1 },
      { name: getWaPhoneFollowupQueueName(i), concurrency: 1 },
    ] as const;
  }).flat();
}

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
  // D0 unified ANAF (replaces D1-D5 individual calls)
  withProvider(QUEUES.ENRICH_ANAF_FULL, 5, "anaf"),
  // D1-D5 legacy (kept for backward compat, read from cache)
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
  // Maintenance (1)
  { name: QUEUES.MAINTENANCE_IMPORT_FILE_CLEANUP, concurrency: 1 },

  // =========================================================================
  // ETAPA 2 — 52 static queues + 40 per-phone queues (HUMAN_REVIEW_ASSIGN added)
  // Source: etapa2-workers-overview.md sec. 3.2
  // =========================================================================

  // A — Quota Guardian
  { name: QUEUES.QUOTA_GUARDIAN_CHECK, concurrency: 100 },
  { name: QUEUES.QUOTA_GUARDIAN_INCREMENT, concurrency: 50 },
  { name: QUEUES.QUOTA_GUARDIAN_RESET, concurrency: 1 },
  { name: QUEUES.QUOTA_BUSINESS_HOURS_CHECK, concurrency: 20 },

  // B — Orchestration
  { name: QUEUES.OUTREACH_ORCHESTRATOR_DISPATCH, concurrency: 20 },
  { name: QUEUES.OUTREACH_ORCHESTRATOR_ROUTER, concurrency: 20 },
  { name: QUEUES.OUTREACH_PHONE_ALLOCATOR, concurrency: 20 },
  { name: QUEUES.OUTREACH_CHANNEL_SELECTOR, concurrency: 20 },

  // C — WhatsApp non-per-phone
  { name: QUEUES.WA_REPLY, concurrency: 10 },
  { name: QUEUES.WA_MESSAGE_RETRY, concurrency: 5 },
  { name: QUEUES.WA_CHAT_HISTORY_FETCH, concurrency: 20 },
  { name: QUEUES.WA_STATUS_SYNC, concurrency: 5 },
  { name: QUEUES.WA_MEDIA_SEND, concurrency: 5 },

  // D — Email Cold
  { name: QUEUES.EMAIL_COLD, concurrency: 50 },
  { name: QUEUES.EMAIL_COLD_CAMPAIGN_CREATE, concurrency: 5 },
  { name: QUEUES.EMAIL_COLD_CAMPAIGN_PAUSE, concurrency: 10 },
  { name: QUEUES.EMAIL_COLD_ANALYTICS_FETCH, concurrency: 5 },
  { name: QUEUES.EMAIL_COLD_LEAD_STATUS, concurrency: 20 },

  // E — Email Warm
  { name: QUEUES.EMAIL_WARM, concurrency: 50 },
  { name: QUEUES.EMAIL_WARM_PROFORMA, concurrency: 20 },
  { name: QUEUES.EMAIL_WARM_DOCUMENT, concurrency: 20 },

  // F — Template processing
  { name: QUEUES.TEMPLATE_SPINTAX_PROCESS, concurrency: 100 },
  { name: QUEUES.TEMPLATE_PERSONALIZE, concurrency: 50 },
  { name: QUEUES.TEMPLATE_VALIDATE, concurrency: 20 },

  // G — Webhooks
  { name: QUEUES.WEBHOOK_TIMELINESAI_INGEST, concurrency: 100 },
  { name: QUEUES.WEBHOOK_INSTANTLY_INGEST, concurrency: 100 },
  { name: QUEUES.WEBHOOK_RESEND_INGEST, concurrency: 100 },
  { name: QUEUES.WEBHOOK_NORMALIZE, concurrency: 100 },

  // H — Sequences
  { name: QUEUES.SEQUENCE_SCHEDULE_FOLLOWUP, concurrency: 20 },
  { name: QUEUES.SEQUENCE_STOP, concurrency: 20 },
  { name: QUEUES.SEQUENCE_ADVANCE, concurrency: 20 },
  { name: QUEUES.SEQUENCE_CREATE, concurrency: 20 },

  // I — Lead State Machine
  { name: QUEUES.LEAD_STATE_TRANSITION, concurrency: 50 },
  { name: QUEUES.LEAD_STATE_VALIDATE, concurrency: 50 },
  { name: QUEUES.LEAD_ASSIGN_USER, concurrency: 20 },

  // J — AI
  { name: QUEUES.AI_SENTIMENT_ANALYZE, concurrency: 20 },
  { name: QUEUES.AI_RESPONSE_GENERATE, concurrency: 10 },
  { name: QUEUES.AI_INTENT_CLASSIFY, concurrency: 20 },

  // K — Monitoring & Alerts
  { name: QUEUES.MONITOR_PHONE_HEALTH, concurrency: 5 },
  { name: QUEUES.MONITOR_EMAIL_DELIVERABILITY, concurrency: 5 },
  { name: QUEUES.MONITOR_QUOTA_USAGE, concurrency: 5 },
  { name: QUEUES.ALERT_PHONE_OFFLINE, concurrency: 10 },
  { name: QUEUES.ALERT_PHONE_BANNED, concurrency: 10 },
  { name: QUEUES.ALERT_BOUNCE_HIGH, concurrency: 10 },

  // L — HITL
  { name: QUEUES.HUMAN_REVIEW_QUEUE, concurrency: 50 },
  { name: QUEUES.HUMAN_REVIEW_ASSIGN, concurrency: 20 },
  { name: QUEUES.HUMAN_TAKEOVER_INITIATE, concurrency: 10 },
  { name: QUEUES.HUMAN_TAKEOVER_COMPLETE, concurrency: 10 },
  { name: QUEUES.HUMAN_APPROVE_MESSAGE, concurrency: 20 },
  { name: QUEUES.HUMAN_REVIEW_ESCALATION, concurrency: 10 },
  { name: QUEUES.HUMAN_REVIEW_AUDIT_LOG, concurrency: 50 },

  // Outreach Pipeline
  { name: QUEUES.PIPELINE_OUTREACH_HEALTH, concurrency: 1 },
  { name: QUEUES.PIPELINE_OUTREACH_METRICS, concurrency: 1 },
  { name: QUEUES.OUTREACH_DLQ, concurrency: 1 },

  // C — Per-phone WhatsApp queues (40 queues, concurrency=1 strict per ADR-0060)
  ...buildWaPhoneQueues(),
];

export const queueNameSet = new Set(queueRegistry.map((queue) => queue.name));

export function getQueueConfig(name: string): QueueConfig | undefined {
  return queueRegistry.find((q) => q.name === name);
}

export function isKnownQueueName(name: string): boolean {
  return QUEUE_NAME_PATTERN.test(name) && queueNameSet.has(name);
}

export function assertQueueRegistryComplete() {
  // 65 Etapa 1 queues (including D0 ANAF full) + 54 Etapa 2 static queues + 40 Etapa 2 per-phone queues = 159
  const expected = 159;
  if (queueRegistry.length !== expected) {
    throw new Error(`Expected ${expected} queues, got ${queueRegistry.length}`);
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

const SCRAPING_PROVIDERS = new Set(["scraping", "nominatim"]);

/**
 * Resolve the retry strategy for a queue by checking the registry's provider
 * field first, then falling back to queue-name prefix matching.
 */
export function getRetryStrategy(queueName: string) {
  if (queueName.startsWith("hitl:")) return RETRY_STRATEGIES.HITL;
  if (queueName.startsWith("pipeline:")) return RETRY_STRATEGIES.PIPELINE;

  const config = getQueueConfig(queueName);
  if (config?.provider) {
    return SCRAPING_PROVIDERS.has(config.provider)
      ? RETRY_STRATEGIES.SCRAPING
      : RETRY_STRATEGIES.EXTERNAL_API;
  }

  if (queueName.startsWith("scrape:") || queueName.startsWith("agri:")) {
    return RETRY_STRATEGIES.SCRAPING;
  }

  return RETRY_STRATEGIES.FAST;
}
