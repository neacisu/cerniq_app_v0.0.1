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
  /** @deprecated Use ENRICH_ANAF_FULL — kept for backward compat references. */
  ENRICH_ANAF_FISCAL_STATUS: "enrich:anaf:fiscal-status",
  /** @deprecated Use ENRICH_ANAF_FULL */
  ENRICH_ANAF_TVA_STATUS: "enrich:anaf:tva-status",
  /** @deprecated Use ENRICH_ANAF_FULL */
  ENRICH_ANAF_EFACTURA: "enrich:anaf:efactura",
  /** @deprecated Use ENRICH_ANAF_FULL */
  ENRICH_ANAF_DATORII: "enrich:anaf:datorii",
  /** @deprecated Use ENRICH_ANAF_FULL */
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

  // J — AI (2 queues — ai:intent:classify removed; intent merged into ai:sentiment:analyze)
  AI_SENTIMENT_ANALYZE: "ai:sentiment:analyze",
  AI_RESPONSE_GENERATE: "ai:response:generate",

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

  // =========================================================================
  // ETAPA 3 — E3 AI Sales: Product Knowledge (A1-A6) + Hybrid Search (B7-B12)
  // Source: Plan FAZA 7b L1762-1771, FAZA 7c L1773-1789
  // =========================================================================

  // A — Product Knowledge (6 queues)
  E3_PRODUCT_INGEST: "product:ingest",
  E3_PRODUCT_EMBED: "product:embed",
  E3_PRODUCT_CHUNK: "product:chunk",
  E3_PRODUCT_INDEX_REBUILD: "product:index:rebuild",
  E3_PRODUCT_CATEGORY_SYNC: "product:category:sync",
  E3_PRODUCT_VARIANT_PROCESS: "product:variant:process",

  // B — Hybrid Search (6 queues)
  E3_SEARCH_QUERY_REWRITE: "search:query:rewrite",
  E3_SEARCH_VECTOR_EXECUTE: "search:vector:execute",
  E3_SEARCH_BM25_EXECUTE: "search:bm25:execute",
  E3_SEARCH_RRF_FUSE: "search:rrf:fuse",
  E3_SEARCH_FILTER_APPLY: "search:filter:apply",
  E3_SEARCH_CACHE_MANAGE: "search:cache:manage",

  // =========================================================================
  // ETAPA 3 — E3 AI Agent Core (C13-C18) + Negotiation FSM (D19-D26) + Pricing (E27-E32)
  // Source: Plan FAZA 7d L1791-1809, FAZA 7e L1819-1837, FAZA 7f L1839-1850
  // =========================================================================

  // C — AI Agent Core (6 queues)
  E3_AI_CONTEXT_BUILD: "ai:context:build",
  E3_AI_AGENT_ORCHESTRATE: "ai:agent:orchestrate",
  /** E3 AI Sales response generation — distinct from E2 outreach AI_RESPONSE_GENERATE */
  E3_AI_RESPONSE_GENERATE: "ai:e3:response:generate",
  E3_AI_RESPONSE_VALIDATE: "ai:response:validate",
  E3_AI_CONVERSATION_STORE: "ai:conversation:store",
  E3_AI_RETRY_REGENERATE: "ai:retry:regenerate",

  // D — Negotiation FSM (8 queues)
  E3_NEGOTIATION_STATE_TRANSITION: "negotiation:state:transition",
  E3_NEGOTIATION_HISTORY_LOG: "negotiation:history:log",
  E3_NEGOTIATION_ITEMS_UPDATE: "negotiation:items:update",
  E3_NEGOTIATION_REMINDER_SEND: "negotiation:reminder:send",
  E3_NEGOTIATION_EXPIRE_CHECK: "negotiation:expire:check",
  E3_NEGOTIATION_CLOSE_EXECUTE: "negotiation:close:execute",
  E3_NEGOTIATION_REOPEN_REQUEST: "negotiation:reopen:request",
  E3_NEGOTIATION_ABANDON_PROCESS: "negotiation:abandon:process",

  // E — Pricing / Discount (6 queues)
  E3_PRICING_DISCOUNT_CALCULATE: "pricing:discount:calculate",
  E3_PRICING_DISCOUNT_APPLY: "pricing:discount:apply",
  E3_PRICING_DISCOUNT_APPROVE: "pricing:discount:approve",
  E3_PRICING_MARGIN_CHECK: "pricing:margin:check",
  E3_PRICING_VOLUME_CALCULATE: "pricing:volume:calculate",
  E3_PRICING_COMPETITOR_CHECK: "pricing:competitor:check",

  // =========================================================================
  // ETAPA 3 — E3 Stock & Inventory Realtime (F33-F38)
  // Source: Plan FAZA 7g L1852-1861
  // =========================================================================

  // F — Stock & Inventory (6 queues)
  E3_STOCK_REALTIME_CHECK: "stock:realtime:check",
  E3_STOCK_RESERVE_CREATE: "stock:reserve:create",
  E3_STOCK_RESERVE_RELEASE: "stock:reserve:release",
  E3_STOCK_SYNC_ERP: "stock:sync:erp",
  E3_STOCK_LOW_ALERT: "stock:low:alert",
  E3_STOCK_REPLENISH_REQUEST: "stock:replenish:request",

  // =========================================================================
  // ETAPA 3 — E3 Oblio Invoicing Integration (G39-G45)
  // Source: Plan FAZA 7h L1863-1873
  // =========================================================================

  // G — Oblio Invoicing (7 queues)
  E3_OBLIO_PROFORMA_CREATE: "oblio:proforma:create",
  E3_OBLIO_PROFORMA_UPDATE: "oblio:proforma:update",
  E3_OBLIO_INVOICE_CREATE: "oblio:invoice:create",
  E3_OBLIO_INVOICE_CANCEL: "oblio:invoice:cancel",
  E3_OBLIO_CLIENT_VALIDATE: "oblio:client:validate",
  E3_OBLIO_STOCK_SYNC: "oblio:stock:sync",
  E3_OBLIO_WEBHOOK_PROCESS: "oblio:webhook:process",

  // =========================================================================
  // ETAPA 3 — E3 eFactura SPV via Oblio (H46-H50)
  // Plan FAZA 7i — integrare eFactura/SPV prin procesatorul Oblio
  // =========================================================================

  // H — eFactura SPV via Oblio (5 queues)
  E3_EINVOICE_SEND: "einvoice:send",
  E3_EINVOICE_STATUS_CHECK: "einvoice:status:check",
  E3_EINVOICE_DEADLINE_MONITOR: "einvoice:deadline:monitor",
  E3_EINVOICE_ARCHIVE_DOWNLOAD: "einvoice:archive:download",
  E3_EINVOICE_RETRY_FAILED: "einvoice:retry:failed",

  // =========================================================================
  // ETAPA 3 — E3 Document Generation (I51-I55)
  // Source: Plan FAZA 7j L1891-1895
  // =========================================================================

  // I — Document Generation (5 queues)
  E3_DOCUMENT_PDF_GENERATE: "document:pdf:generate",
  E3_DOCUMENT_EMAIL_SEND: "document:email:send",
  E3_DOCUMENT_WHATSAPP_SEND: "document:whatsapp:send",
  E3_DOCUMENT_TEMPLATE_COMPILE: "document:template:compile",
  E3_DOCUMENT_ARCHIVE_STORE: "document:archive:store",

  // =========================================================================
  // ETAPA 3 — E3 Handover & Channel Routing (J56-J60)
  // Source: Plan FAZA 7k L1896-1900
  // =========================================================================

  // J — Handover & Channel Routing (5 queues)
  E3_HANDOVER_DETECT: "handover:detect",
  E3_HANDOVER_CONTEXT_LOAD: "handover:context:load",
  E3_CHANNEL_ROUTE_DECIDE: "channel:route:decide",
  E3_CHANNEL_WHATSAPP_SEND: "channel:whatsapp:send",
  E3_CHANNEL_EMAIL_SEND: "channel:email:send",

  // =========================================================================
  // ETAPA 3 — E3 Sentiment & Intent Analysis (K61-K65)
  // Source: Plan FAZA 7l L1901-1905
  // =========================================================================

  // K — Sentiment & Intent Analysis (5 queues)
  E3_SENTIMENT_ANALYZE: "sentiment:analyze",
  E3_INTENT_CLASSIFY: "intent:classify",
  E3_OBJECTION_DETECT: "objection:detect",
  E3_SENTIMENT_TREND_ANALYZE: "sentiment:trend:analyze",
  E3_FEEDBACK_COLLECT: "feedback:collect",

  // L — MCP Server (5 queues) — FAZA 7m L1906-1910
  E3_MCP_RESOURCE_LOAD: "mcp:resource:load",
  E3_MCP_TOOL_REGISTER: "mcp:tool:register",
  E3_MCP_SESSION_MANAGE: "mcp:session:manage",
  E3_MCP_HEALTH_CHECK: "mcp:health:check",
  E3_MCP_METRICS_COLLECT: "mcp:metrics:collect",

  // M — Guardrails Zero Hallucination (5 queues) — FAZA 7n L1911-1926
  E3_GUARDRAIL_PRICE_CHECK: "guardrail:price:check",
  E3_GUARDRAIL_STOCK_CHECK: "guardrail:stock:check",
  E3_GUARDRAIL_DISCOUNT_CHECK: "guardrail:discount:check",
  E3_GUARDRAIL_SKU_VALIDATE: "guardrail:sku:validate",
  E3_GUARDRAIL_FISCAL_VALIDATE: "guardrail:fiscal:validate",

  // N — HITL E3 Human-In-The-Loop (3 queues) — FAZA 7o L1916-1918
  E3_HUMAN_ESCALATE: "human:escalate",
  E3_HUMAN_TAKEOVER: "human:takeover",
  E3_HUMAN_APPROVE: "human:approve",

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: Revolut Payments & Webhooks (A1-A6)
  // Source: Plan FAZA 8b L2026-2036, §IX L2030-2035
  // Redis DB: 4 (REDIS_DB_E4=4 conform Plan §XIV L2762)
  // Rate limit: Revolut Business API = 100 req/min (plan §IX)
  // =========================================================================

  // A — Revolut Payments & Webhooks (6 queues)
  E4_REVOLUT_WEBHOOK_INGEST: "revolut:webhook:ingest",
  E4_REVOLUT_TRANSACTION_PROCESS: "revolut:transaction:process",
  E4_REVOLUT_PAYMENT_RECORD: "revolut:payment:record",
  E4_REVOLUT_REFUND_PROCESS: "revolut:refund:process",
  E4_REVOLUT_BALANCE_SYNC: "revolut:balance:sync",
  E4_REVOLUT_WEBHOOK_VALIDATE: "revolut:webhook:validate",

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: Reconciliere Plăți Three-Tier (B7-B12)
  // Source: Plan FAZA 8c §IX L2037-2047
  // Redis DB: 4 (REDIS_DB_E4=4 conform Plan §XIV L2762)
  // =========================================================================

  // B7: reconciliere automată Tier 1 — exact match referință ±0.01 RON
  E4_PAYMENT_RECONCILE_AUTO: "payment:reconcile:auto",
  // B8: reconciliere fuzzy Tier 2 — pg_trgm similarity ≥0.85 + sumă ±5%
  E4_PAYMENT_RECONCILE_FUZZY: "payment:reconcile:fuzzy",
  // B9: reconciliere manuală Tier 3 — HITL cu candidați scorați
  E4_PAYMENT_RECONCILE_MANUAL: "payment:reconcile:manual",
  // B10: actualizare sold comandă post-match
  E4_PAYMENT_BALANCE_UPDATE: "payment:balance:update",
  // B11: detecție comenzi restante — cron 0 9 * * * (plan §XII Cron L2124)
  E4_PAYMENT_OVERDUE_DETECT: "payment:overdue:detect",
  // B12: escalare graduated restanțe (1-7d WARNING, 7-14d WA, 14+ CRITICAL HITL)
  E4_PAYMENT_OVERDUE_ESCALATE: "payment:overdue:escalate",

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: Credit Scoring 100p (C13-D21)
  // Source: Plan FAZA 8d §IX L2048-2070
  // =========================================================================

  E4_CREDIT_PROFILE_CREATE: "credit:profile:create",
  E4_CREDIT_DATA_FETCH_ANAF: "credit:data:fetch-anaf",
  E4_CREDIT_DATA_FETCH_BILANT: "credit:data:fetch-bilant",
  E4_CREDIT_DATA_FETCH_BPI: "credit:data:fetch-bpi",
  E4_CREDIT_SCORE_CALCULATE: "credit:score:calculate",
  E4_CREDIT_LIMIT_CALCULATE: "credit:limit:calculate",
  E4_CREDIT_LIMIT_CHECK: "credit:limit:check",
  E4_CREDIT_LIMIT_RESERVE: "credit:limit:reserve",
  E4_CREDIT_LIMIT_RELEASE: "credit:limit:release",
  /** CRON 0 3 * * * — bulk refresh profile credit via Termene.ro */
  E4_CREDIT_REFRESH_ALL: "pipeline:credit:refresh-all",
  // CRON cada 15 min — expire rezervări stale (persistent DB, NU TTL Redis)
  E4_RESERVATION_EXPIRE: "pipeline:reservation:expire",

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: Sameday AWB + Tracking (E22-E27)
  // Plan FAZA 8e §IX L2072-2087
  // =========================================================================

  /** E22: trigger la order:ready — creare AWB + INSERT gold_shipments */
  E4_SAMEDAY_AWB_CREATE: "sameday:awb:create",
  /** E23: cron cada 30 min — poll status toate expedierile SAMEDAY active */
  E4_SAMEDAY_STATUS_POLL: "sameday:status:poll",
  /** E24: procesare schimbare status (enqueue din E23 când statusCode diferit) */
  E4_SAMEDAY_STATUS_PROCESS: "sameday:status:process",
  /** E25: procesare colectare COD la DELIVERED (enqueue din E24) */
  E4_SAMEDAY_COD_PROCESS: "sameday:cod:process",
  /** E26: inițiere returnare la 3×DELIVERY_FAILED (enqueue din E24) */
  E4_SAMEDAY_RETURN_INITIATE: "sameday:return:initiate",
  /** E27: cron 0 14 * * * — batch pickup schedule pentru expedieri CREATED */
  E4_SAMEDAY_PICKUP_SCHEDULE: "sameday:pickup:schedule",

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: Contracte DocuSign (G32-G36)
  // Plan FAZA 8f §IX L2093-L2099
  // =========================================================================

  /** G32: trigger la order:credit_approved — generare DOCX → PDF contract */
  E4_CONTRACT_GENERATE: "contract:generate",
  /** G33: selecție clauze per riskTier (enqueue din G32) */
  E4_CONTRACT_CLAUSES_SELECT: "contract:clauses:select",
  /** G34: creare envelope DocuSign + send (enqueue din G33) */
  E4_CONTRACT_DOCUSIGN_SEND: "contract:docusign:send",
  /** G35: cron 0 1 * * * — polling status DocuSign envelopes SENT_DOCUSIGN */
  E4_CONTRACT_STATUS_POLL: "contract:status:poll",
  /** G36: procesare contract semnat — download PDF + arhivare (enqueue din G35) */
  E4_CONTRACT_SIGNED_PROCESS: "contract:signed:process",

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: Stock Sync Oblio (F28-F31)
  // Plan FAZA 8g §IX L2092-2097
  // =========================================================================

  /** F28: cron every 15 minutes (slash-star-15 pattern) — sync stock Oblio ERP -> internal DB */
  E4_STOCK_SYNC_OBLIO: "stock:sync:oblio",
  /** F29: la DELIVERED → deduct stock per produs din comandă */
  E4_STOCK_DEDUCT: "stock:deduct",
  /** F30: la RETURNED → reverse deduct stock per produs */
  E4_STOCK_RETURN: "stock:return",
  /** F31: alert stoc scăzut — threshold per produs, enqueue alert */
  E4_STOCK_LOW_ALERT: "stock:low:alert",

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: Returns (H37-H38)
  // =========================================================================

  /** H37: inițiere retur — trigger la RETURNED order, creare retur request */
  E4_RETURN_INITIATE: "return:initiate",
  /** H38: procesare retur — stoc + audit + refund trigger */
  E4_RETURN_PROCESS: "return:process",

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: AlertNeuron (I39-I44)
  // Plan FAZA 8g §IX L2092-2097
  // =========================================================================

  /** I39: alertă plată — trigger din B11/B12 overdue events */
  E4_ALERT_PAYMENT: "alert:payment",
  /** I40: alertă livrare — trigger din E24 DELIVERY_FAILED events */
  E4_ALERT_DELIVERY: "alert:delivery",
  /** I41: alertă credit — trigger din C17/C18 credit scoring events */
  E4_ALERT_CREDIT: "alert:credit",
  /** I42: alertă contract — trigger din G35 ContractExpirySoon events */
  E4_ALERT_CONTRACT: "alert:contract",
  /** I43: alertă stoc — trigger din F31 low stock events */
  E4_ALERT_STOCK: "alert:stock",
  /** I44: alertă dispatch — trigger din E22 AWB failed events */
  E4_ALERT_DISPATCH: "alert:dispatch",

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: ComplianceNeuron Audit Hash-Chain (J45-J47)
  // Plan FAZA 8g ADR-0095
  // =========================================================================

  /** J45: scriere audit log cu hash chain — concurrency=1 (serializare per tenant) */
  E4_AUDIT_LOG_WRITE: "audit:log:write",
  /** J46: cron 0 6 * * * — verificare integritate hash chain audit */
  E4_AUDIT_CHAIN_VERIFY: "audit:chain:verify",
  /** J47: cron 0 2 * * 0 — anonimizare GDPR entries >7 ani */
  E4_AUDIT_DATA_ANONYMIZE: "audit:data:anonymize",

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: HumanNeuron HITL (K48-K53)
  // Plan FAZA 8g §IX L2110-2117
  // =========================================================================

  /** K48: aprobare manuală credit depășit — approver=SALES_MANAGER/CFO, SLA=4h */
  E4_HITL_CREDIT_OVERRIDE: "hitl:approval:credit-override",
  /** K49: aprobare limită credit >50K RON — approver=CFO, SLA=4h */
  E4_HITL_CREDIT_LIMIT: "hitl:approval:credit-limit",
  /** K50: aprobare rambursare >1K RON — approver=FINANCE_MANAGER, SLA=4h */
  E4_HITL_REFUND_LARGE: "hitl:approval:refund-large",
  /** K51: investigare plată Tier 3 no match — approver=ACCOUNTING, SLA=8h */
  E4_HITL_PAYMENT_INVESTIGATION: "hitl:investigation:payment",
  /** K52: rezolvare manuală task — trigger UI action, SLA=— */
  E4_HITL_TASK_RESOLVE: "hitl:task:resolve",
  /** K53: escalare overdue SLA breach → escalateTo chain, severity=CRITICAL */
  E4_HITL_ESCALATION_OVERDUE: "hitl:escalation:overdue",

  // =========================================================================
  // ETAPA 5 — E5 Nurturing Lifecycle FSM 7 stări (A1-A8)
  // Source: Plan FAZA 9b §X L2224-2233, ADR-0098
  // Redis DB: 5 (REDIS_DB_E5=5 conform Plan §XIV L2763)
  // =========================================================================

  /** A1: event order DELIVERED din E4 → cross-etapa bridge */
  E5_LIFECYCLE_ORDER_COMPLETED: "lifecycle:order:completed",
  /** A2: evaluare periodică + signal-triggered */
  E5_LIFECYCLE_STATE_EVALUATE: "lifecycle:state:evaluate",
  /** A3: A1 new client → start secvență onboarding */
  E5_ONBOARDING_SEQUENCE_START: "onboarding:sequence:start",
  /** A4: A3 + schedule → execuție pas onboarding cu delay BullMQ */
  E5_ONBOARDING_STEP_EXECUTE: "onboarding:step:execute",
  /** A5: A4 onComplete → verificare completare onboarding */
  E5_ONBOARDING_COMPLETE_CHECK: "onboarding:complete:check",
  /** A6: A2 decision → execuție tranziție FSM */
  E5_STATE_TRANSITION_EXECUTE: "state:transition:execute",
  /** A7: post-transition → actualizare metrici Prometheus + daysSinceLastOrder */
  E5_STATE_METRICS_UPDATE: "state:metrics:update",
  /** A8: ≥3 orders + NPS≥8 + ≥2 referrals → promovare ADVOCATE */
  E5_STATE_ADVOCATE_PROMOTE: "state:advocate:promote",

  // ── E5 FAZA 9c: Churn Detection AI — B9-B14 ─────────────────────────────
  /** B9: detectare rule-based 8 semnale churn (determinist, fără AI) */
  E5_CHURN_SIGNAL_DETECT: "churn:signal:detect",
  /** B10: formula ponderată ChurnScore = Σ(signal_strength × weight × confidence) */
  E5_CHURN_SCORE_CALCULATE: "churn:score:calculate",
  /** B11: escalare HITL dacă riskLevel=CRITICAL/HIGH; SLA CRITICAL=2h, HIGH=8h */
  E5_CHURN_RISK_ESCALATE: "churn:risk:escalate",
  /** B12: sentiment analysis AI — PRIMARY QwQ-32B-AWQ, FALLBACK Claude Sonnet */
  E5_SENTIMENT_ANALYZE: "sentiment:analyze",
  /** B13: agregare trend sentiment per client — avg last 30d vs prev 30d */
  E5_SENTIMENT_AGGREGATE: "sentiment:aggregate",
  /** B14: detectare pattern behavioral decay (order frequency, engagement) */
  E5_DECAY_BEHAVIOR_DETECT: "decay:behavior:detect",

  // ── E5 FAZA 9d: PostGIS Proximity Workers — C15-C19 ──────────────────────
  /** C15: ST_DWithin + KNN <-> proximity calculate, UPSERT gold_proximity_scores */
  E5_GEO_PROXIMITY_CALCULATE: "geo:proximity:calculate",
  /** C16: proximityScore >= 0.6 → INSERT gold_entity_relationships NEIGHBOR */
  E5_GEO_NEIGHBOR_IDENTIFY: "geo:neighbor:identify",
  /** C17: ST_ConvexHull(ST_Collect(location::geometry)) per cluster → UPDATE gold_clusters */
  E5_GEO_TERRITORY_CALCULATE: "geo:territory:calculate",
  /** C18: Coverage heatmap per județ — count clienți, revenue, penetration rate */
  E5_GEO_COVERAGE_ANALYZE: "geo:coverage:analyze",
  /** C19: Catchment zones Voronoi-like — nearest anchor per prospect (KNN) */
  E5_GEO_CATCHMENT_BUILD: "geo:catchment:build",
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
  // D (1 — unified ANAF full-fetch replaces D1-D5)
  withProvider(QUEUES.ENRICH_ANAF_FULL, 1, "anaf"),
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

  // J — AI (ai:sentiment:analyze only — ai:response:generate kept in E2 outreach worker only,
  //         E3 uses ai:e3:response:generate via QUEUES.E3_AI_RESPONSE_GENERATE)
  { name: QUEUES.AI_SENTIMENT_ANALYZE, concurrency: 20 },

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

  // =========================================================================
  // ETAPA 3 — E3 AI Sales: Product Knowledge (A1-A6) + Hybrid Search (B7-B12)
  // Plan FAZA 7b L1762-1771 + FAZA 7c L1773-1789
  // =========================================================================

  // A — Product Knowledge (6 queues)
  { name: QUEUES.E3_PRODUCT_INGEST, concurrency: 5 },
  {
    name: QUEUES.E3_PRODUCT_EMBED,
    concurrency: 10,
    provider: "infraq-embeddings",
    rateLimit: { max: 60, duration: 60_000 },
  },
  { name: QUEUES.E3_PRODUCT_CHUNK, concurrency: 20 },
  { name: QUEUES.E3_PRODUCT_INDEX_REBUILD, concurrency: 1 },
  { name: QUEUES.E3_PRODUCT_CATEGORY_SYNC, concurrency: 5 },
  { name: QUEUES.E3_PRODUCT_VARIANT_PROCESS, concurrency: 10 },

  // B — Hybrid Search (6 queues)
  { name: QUEUES.E3_SEARCH_QUERY_REWRITE, concurrency: 20 },
  { name: QUEUES.E3_SEARCH_VECTOR_EXECUTE, concurrency: 50 },
  { name: QUEUES.E3_SEARCH_BM25_EXECUTE, concurrency: 50 },
  { name: QUEUES.E3_SEARCH_RRF_FUSE, concurrency: 50 },
  { name: QUEUES.E3_SEARCH_FILTER_APPLY, concurrency: 50 },
  { name: QUEUES.E3_SEARCH_CACHE_MANAGE, concurrency: 10 },

  // =========================================================================
  // ETAPA 3 — E3 AI Agent Core (C) + Negotiation FSM (D) + Pricing (E)
  // Plan FAZA 7d L1791-1809 + FAZA 7e L1819-1837 + FAZA 7f L1839-1850
  // =========================================================================

  // C — AI Agent Core (6 queues — E3_AI_RESPONSE_GENERATE renamed to ai:e3:response:generate)
  { name: QUEUES.E3_AI_CONTEXT_BUILD, concurrency: 20 },
  {
    name: QUEUES.E3_AI_AGENT_ORCHESTRATE,
    concurrency: 10,
    provider: "infraq-reasoning",
    rateLimit: { max: 10, duration: 60_000 },
  },
  {
    name: QUEUES.E3_AI_RESPONSE_GENERATE,
    concurrency: 10,
    provider: "infraq-reasoning",
    rateLimit: { max: 10, duration: 60_000 },
  },
  { name: QUEUES.E3_AI_RESPONSE_VALIDATE, concurrency: 20 },
  { name: QUEUES.E3_AI_CONVERSATION_STORE, concurrency: 20 },
  {
    name: QUEUES.E3_AI_RETRY_REGENERATE,
    concurrency: 5,
    provider: "infraq-reasoning",
    rateLimit: { max: 5, duration: 60_000 },
  },

  // D — Negotiation FSM (8 queues)
  { name: QUEUES.E3_NEGOTIATION_STATE_TRANSITION, concurrency: 10 },
  { name: QUEUES.E3_NEGOTIATION_HISTORY_LOG, concurrency: 20 },
  { name: QUEUES.E3_NEGOTIATION_ITEMS_UPDATE, concurrency: 10 },
  { name: QUEUES.E3_NEGOTIATION_REMINDER_SEND, concurrency: 5 },
  { name: QUEUES.E3_NEGOTIATION_EXPIRE_CHECK, concurrency: 5 },
  { name: QUEUES.E3_NEGOTIATION_CLOSE_EXECUTE, concurrency: 5 },
  { name: QUEUES.E3_NEGOTIATION_REOPEN_REQUEST, concurrency: 3 },
  { name: QUEUES.E3_NEGOTIATION_ABANDON_PROCESS, concurrency: 5 },

  // E — Pricing / Discount (6 queues)
  { name: QUEUES.E3_PRICING_DISCOUNT_CALCULATE, concurrency: 20 },
  { name: QUEUES.E3_PRICING_DISCOUNT_APPLY, concurrency: 10 },
  { name: QUEUES.E3_PRICING_DISCOUNT_APPROVE, concurrency: 5 },
  { name: QUEUES.E3_PRICING_MARGIN_CHECK, concurrency: 50 },
  { name: QUEUES.E3_PRICING_VOLUME_CALCULATE, concurrency: 20 },
  { name: QUEUES.E3_PRICING_COMPETITOR_CHECK, concurrency: 5 },

  // =========================================================================
  // ETAPA 3 — E3 Stock & Inventory Realtime (F33-F38)
  // Plan FAZA 7g L1852-1861
  // =========================================================================

  // F — Stock & Inventory (6 queues)
  { name: QUEUES.E3_STOCK_REALTIME_CHECK, concurrency: 20 },
  { name: QUEUES.E3_STOCK_RESERVE_CREATE, concurrency: 10 },
  { name: QUEUES.E3_STOCK_RESERVE_RELEASE, concurrency: 5 },
  { name: QUEUES.E3_STOCK_SYNC_ERP, concurrency: 5 },
  { name: QUEUES.E3_STOCK_LOW_ALERT, concurrency: 5 },
  { name: QUEUES.E3_STOCK_REPLENISH_REQUEST, concurrency: 5 },

  // =========================================================================
  // ETAPA 3 — E3 Oblio Invoicing Integration (G39-G45)
  // Plan FAZA 7h L1863-1873
  // =========================================================================

  // G — Oblio Invoicing (7 queues) — rate limits per endpoint Oblio API
  {
    name: QUEUES.E3_OBLIO_PROFORMA_CREATE,
    concurrency: 5,
    rateLimit: { max: 60, duration: 60_000 },
  },
  { name: QUEUES.E3_OBLIO_PROFORMA_UPDATE, concurrency: 5 },
  {
    name: QUEUES.E3_OBLIO_INVOICE_CREATE,
    concurrency: 5,
    rateLimit: { max: 60, duration: 60_000 },
  },
  {
    name: QUEUES.E3_OBLIO_INVOICE_CANCEL,
    concurrency: 2,
    rateLimit: { max: 10, duration: 60_000 },
  },
  { name: QUEUES.E3_OBLIO_CLIENT_VALIDATE, concurrency: 3, rateLimit: { max: 1, duration: 1_000 } },
  { name: QUEUES.E3_OBLIO_STOCK_SYNC, concurrency: 5 },
  { name: QUEUES.E3_OBLIO_WEBHOOK_PROCESS, concurrency: 10 },

  // =========================================================================
  // ETAPA 3 — E3 eFactura SPV via Oblio (H46-H50)
  // Plan FAZA 7i — rate limit 30/100s conform documentație Oblio
  // =========================================================================

  // H — eFactura SPV (5 queues) — rate limit 30/100s via Oblio
  { name: QUEUES.E3_EINVOICE_SEND, concurrency: 5, rateLimit: { max: 30, duration: 100_000 } },
  { name: QUEUES.E3_EINVOICE_STATUS_CHECK, concurrency: 5 },
  { name: QUEUES.E3_EINVOICE_DEADLINE_MONITOR, concurrency: 1 },
  { name: QUEUES.E3_EINVOICE_ARCHIVE_DOWNLOAD, concurrency: 3 },
  { name: QUEUES.E3_EINVOICE_RETRY_FAILED, concurrency: 5 },

  // =========================================================================
  // ETAPA 3 — E3 Document Generation (I51-I55)
  // Plan FAZA 7j L1891-1895
  // =========================================================================

  // I — Document Generation (5 queues)
  { name: QUEUES.E3_DOCUMENT_PDF_GENERATE, concurrency: 5 },
  { name: QUEUES.E3_DOCUMENT_EMAIL_SEND, concurrency: 10 },
  { name: QUEUES.E3_DOCUMENT_WHATSAPP_SEND, concurrency: 5 },
  { name: QUEUES.E3_DOCUMENT_TEMPLATE_COMPILE, concurrency: 10 },
  { name: QUEUES.E3_DOCUMENT_ARCHIVE_STORE, concurrency: 5 },

  // =========================================================================
  // ETAPA 3 — E3 Handover & Channel Routing (J56-J60)
  // Plan FAZA 7k L1896-1900
  // =========================================================================

  // J — Handover & Channel Routing (5 queues)
  { name: QUEUES.E3_HANDOVER_DETECT, concurrency: 10 },
  { name: QUEUES.E3_HANDOVER_CONTEXT_LOAD, concurrency: 10 },
  { name: QUEUES.E3_CHANNEL_ROUTE_DECIDE, concurrency: 10 },
  { name: QUEUES.E3_CHANNEL_WHATSAPP_SEND, concurrency: 10 },
  { name: QUEUES.E3_CHANNEL_EMAIL_SEND, concurrency: 10 },

  // =========================================================================
  // ETAPA 3 — E3 Sentiment & Intent Analysis (K61-K65)
  // Plan FAZA 7l L1901-1905
  // =========================================================================

  // K — Sentiment & Intent Analysis (5 queues)
  { name: QUEUES.E3_SENTIMENT_ANALYZE, concurrency: 20 },
  { name: QUEUES.E3_INTENT_CLASSIFY, concurrency: 20 },
  { name: QUEUES.E3_OBJECTION_DETECT, concurrency: 10 },
  { name: QUEUES.E3_SENTIMENT_TREND_ANALYZE, concurrency: 1 },
  { name: QUEUES.E3_FEEDBACK_COLLECT, concurrency: 5 },

  // =========================================================================
  // ETAPA 3 — E3 MCP Server (L66-L70)
  // Plan FAZA 7m L1906-1910
  // =========================================================================

  // L — MCP Server (5 queues)
  { name: QUEUES.E3_MCP_RESOURCE_LOAD, concurrency: 20 },
  { name: QUEUES.E3_MCP_TOOL_REGISTER, concurrency: 5 },
  { name: QUEUES.E3_MCP_SESSION_MANAGE, concurrency: 10 },
  { name: QUEUES.E3_MCP_HEALTH_CHECK, concurrency: 1 },
  { name: QUEUES.E3_MCP_METRICS_COLLECT, concurrency: 1 },

  // =========================================================================
  // ETAPA 3 — E3 Guardrails Zero Hallucination (M71-M75)
  // Plan FAZA 7n L1911-1926, ADR-0073, ADR-0081
  // =========================================================================

  // M — Guardrails (5 queues, CRITICAL — concurrency:20 fiecare)
  { name: QUEUES.E3_GUARDRAIL_PRICE_CHECK, concurrency: 20 },
  { name: QUEUES.E3_GUARDRAIL_STOCK_CHECK, concurrency: 20 },
  { name: QUEUES.E3_GUARDRAIL_DISCOUNT_CHECK, concurrency: 20 },
  { name: QUEUES.E3_GUARDRAIL_SKU_VALIDATE, concurrency: 20 },
  { name: QUEUES.E3_GUARDRAIL_FISCAL_VALIDATE, concurrency: 20 },

  // =========================================================================
  // ETAPA 3 — E3 HITL Human-In-The-Loop (N76-N78)
  // Plan FAZA 7o L1916-1918, SLA E3: 4h (plan L1604)
  // =========================================================================

  // N — HITL E3 (3 queues)
  { name: QUEUES.E3_HUMAN_ESCALATE, concurrency: 5 },
  { name: QUEUES.E3_HUMAN_TAKEOVER, concurrency: 5 },
  { name: QUEUES.E3_HUMAN_APPROVE, concurrency: 10 },

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: Revolut Payments & Webhooks (A1-A6)
  // Plan FAZA 8b L2026-2036, §IX L2030-2035
  // Rate limit: 100 req/min Revolut Business API (plan §IX)
  // =========================================================================

  // A — Revolut Payments & Webhooks (6 queues)
  // A1: ingest webhook → idempotency Redis SET NX EX 86400 + persistare DB + enqueue A2+A6
  {
    name: QUEUES.E4_REVOLUT_WEBHOOK_INGEST,
    concurrency: 50,
    rateLimit: { max: 100, duration: 60_000 },
  },
  // A2: procesare tranzacție (A1 child job) — parsare eventType
  { name: QUEUES.E4_REVOLUT_TRANSACTION_PROCESS, concurrency: 20 },
  // A3: înregistrare plată + trigger B7 reconciliere
  { name: QUEUES.E4_REVOLUT_PAYMENT_RECORD, concurrency: 10 },
  // A4: procesare rambursare (trigger manual/API)
  { name: QUEUES.E4_REVOLUT_REFUND_PROCESS, concurrency: 5 },
  // A5: sincronizare sold — cron */30 * * * * (plan §XII L2123)
  { name: QUEUES.E4_REVOLUT_BALANCE_SYNC, concurrency: 1 },
  // A6: validare HMAC-SHA256 X-Revolut-Signature-V1 (A1 paralel)
  {
    name: QUEUES.E4_REVOLUT_WEBHOOK_VALIDATE,
    concurrency: 50,
    rateLimit: { max: 100, duration: 60_000 },
  },

  // ── E4 Reconciliere Plăți Three-Tier (B7-B12) ─────────────────────────────
  // B7: reconciliere auto Tier 1 exact match (enqueue din A3)
  { name: QUEUES.E4_PAYMENT_RECONCILE_AUTO, concurrency: 20 },
  // B8: reconciliere fuzzy Tier 2 pg_trgm (enqueue din B7 când 0 matches)
  { name: QUEUES.E4_PAYMENT_RECONCILE_FUZZY, concurrency: 10 },
  // B9: reconciliere manuală Tier 3 HITL (enqueue din B7/>1 sau B8/<0.85)
  { name: QUEUES.E4_PAYMENT_RECONCILE_MANUAL, concurrency: 5 },
  // B10: actualizare sold comandă post-match (enqueue din B7/B8/B9)
  { name: QUEUES.E4_PAYMENT_BALANCE_UPDATE, concurrency: 20 },
  // B11: detecție restanțe — cron 0 9 * * * (plan §XII L2124)
  { name: QUEUES.E4_PAYMENT_OVERDUE_DETECT, concurrency: 1 },
  // B12: escalare restanțe graduated (enqueue din B11)
  { name: QUEUES.E4_PAYMENT_OVERDUE_ESCALATE, concurrency: 10 },

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: Credit Scoring 100p (C13-D21) + 2 Cron
  // Plan FAZA 8d §IX L2048-2070
  // Redis DB: 4 (REDIS_DB_E4=4 conform Plan §XIV L2762)
  // =========================================================================

  // C13: creare profil credit + fan-out FlowProducer C14+C15+C16
  { name: QUEUES.E4_CREDIT_PROFILE_CREATE, concurrency: 3 },
  // C14: fetch date ANAF (status fiscal + TVA) → cache Redis 24h
  { name: QUEUES.E4_CREDIT_DATA_FETCH_ANAF, concurrency: 5 },
  // C15: fetch bilanț Termene.ro (3 ani CA/profit/equity)
  { name: QUEUES.E4_CREDIT_DATA_FETCH_BILANT, concurrency: 5 },
  // C16: fetch BPI proceduri insolvență via Termene.ro dosare
  { name: QUEUES.E4_CREDIT_DATA_FETCH_BPI, concurrency: 5 },
  // C17: calculare scor 100p (după C14+C15+C16 complete — FlowProducer parent)
  { name: QUEUES.E4_CREDIT_SCORE_CALCULATE, concurrency: 3 },
  // C18: calcul limită credit + HITL dacă >50K RON (SLA 4h CFO)
  { name: QUEUES.E4_CREDIT_LIMIT_CALCULATE, concurrency: 3 },
  // D19: verificare limită credit la order:created (CRITICAL path)
  { name: QUEUES.E4_CREDIT_LIMIT_CHECK, concurrency: 20 },
  // D20: rezervare credit (după D19 approved)
  { name: QUEUES.E4_CREDIT_LIMIT_RESERVE, concurrency: 10 },
  // D21: eliberare rezervare la order:paid sau order:cancelled
  { name: QUEUES.E4_CREDIT_LIMIT_RELEASE, concurrency: 10 },
  // CRON 0 3 * * * — refresh bulk profile credit via Termene.ro
  { name: QUEUES.E4_CREDIT_REFRESH_ALL, concurrency: 1 },
  // CRON */15 * * * * — expire rezervări stale (persistent în DB)
  { name: QUEUES.E4_RESERVATION_EXPIRE, concurrency: 1 },

  // =========================================================================
  // ETAPA 4 — E4 Post-Sale: Sameday AWB + Tracking (E22-E27)
  // Plan FAZA 8e §IX L2072-2087, ADR-0092
  // Rate limit: 30 req/min Sameday Business API
  // =========================================================================

  // E22: creare AWB la order:ready — apel Sameday POST /api/awb
  {
    name: QUEUES.E4_SAMEDAY_AWB_CREATE,
    concurrency: 5,
    provider: "sameday",
    rateLimit: { max: 30, duration: 60_000 },
  },
  // E23: cron global */30 min — poll status toate expedierile SAMEDAY active
  { name: QUEUES.E4_SAMEDAY_STATUS_POLL, concurrency: 1 },
  // E24: procesare schimbare status (enqueue din E23 la status diferit)
  { name: QUEUES.E4_SAMEDAY_STATUS_PROCESS, concurrency: 10 },
  // E25: colectare COD la DELIVERED (enqueue din E24)
  { name: QUEUES.E4_SAMEDAY_COD_PROCESS, concurrency: 5 },
  // E26: inițiere returnare la 3×DELIVERY_FAILED (enqueue din E24)
  { name: QUEUES.E4_SAMEDAY_RETURN_INITIATE, concurrency: 3 },
  // E27: cron 0 14 * * * — batch pickup schedule pentru expedieri CREATED
  { name: QUEUES.E4_SAMEDAY_PICKUP_SCHEDULE, concurrency: 1 },
  // ─── FAZA 8f — G32-G36 Contracte DocuSign ─────────────────────────────
  // G32: generare DOCX → PDF contract (trigger la credit_approved)
  { name: QUEUES.E4_CONTRACT_GENERATE, concurrency: 3 },
  // G33: selecție clauze per riskTier (enqueue din G32)
  { name: QUEUES.E4_CONTRACT_CLAUSES_SELECT, concurrency: 5 },
  // G34: creare envelope DocuSign + send (enqueue din G33); rate 1000 req/h DocuSign
  {
    name: QUEUES.E4_CONTRACT_DOCUSIGN_SEND,
    concurrency: 3,
    provider: "docusign",
    rateLimit: { max: 15, duration: 60_000 },
  },
  // G35: cron 0 1 * * * — polling status DocuSign envelopes SENT_DOCUSIGN
  { name: QUEUES.E4_CONTRACT_STATUS_POLL, concurrency: 1 },
  // G36: procesare contract semnat — download PDF + arhivare
  { name: QUEUES.E4_CONTRACT_SIGNED_PROCESS, concurrency: 3 },
  // ─── FAZA 8g — F28-F31 Stock Sync Oblio ──────────────────────────────────
  // F28: cron */15 — sync stock Oblio ERP → goldProducts.metadata.stockCount
  { name: QUEUES.E4_STOCK_SYNC_OBLIO, concurrency: 2 },
  // F29: la DELIVERED → deduct stock per produs din comandă
  { name: QUEUES.E4_STOCK_DEDUCT, concurrency: 10 },
  // F30: la RETURNED → reverse deduct stock
  { name: QUEUES.E4_STOCK_RETURN, concurrency: 5 },
  // F31: alert stoc scăzut per produs
  { name: QUEUES.E4_STOCK_LOW_ALERT, concurrency: 5 },
  // ─── FAZA 8g — H37-H38 Returns ───────────────────────────────────────────
  // H37: inițiere retur — trigger la order RETURNED
  { name: QUEUES.E4_RETURN_INITIATE, concurrency: 5 },
  // H38: procesare retur — stoc + audit + notificare
  { name: QUEUES.E4_RETURN_PROCESS, concurrency: 5 },
  // ─── FAZA 8g — I39-I44 AlertNeuron ───────────────────────────────────────
  // I39: alertă plată overdue
  { name: QUEUES.E4_ALERT_PAYMENT, concurrency: 10 },
  // I40: alertă livrare eșuată
  { name: QUEUES.E4_ALERT_DELIVERY, concurrency: 10 },
  // I41: alertă credit HITL
  { name: QUEUES.E4_ALERT_CREDIT, concurrency: 10 },
  // I42: alertă contract expirare
  { name: QUEUES.E4_ALERT_CONTRACT, concurrency: 10 },
  // I43: alertă stoc scăzut
  { name: QUEUES.E4_ALERT_STOCK, concurrency: 10 },
  // I44: alertă dispatch AWB failed
  { name: QUEUES.E4_ALERT_DISPATCH, concurrency: 10 },
  // ─── FAZA 8g — J45-J47 ComplianceNeuron Audit ────────────────────────────
  // J45: scriere audit log cu hash chain — CRITICAL: concurrency=1 (hash chain serializare)
  { name: QUEUES.E4_AUDIT_LOG_WRITE, concurrency: 1 },
  // J46: cron 0 6 * * * — verificare integritate hash chain
  { name: QUEUES.E4_AUDIT_CHAIN_VERIFY, concurrency: 1 },
  // J47: cron 0 2 * * 0 — anonimizare GDPR entries >7 ani
  { name: QUEUES.E4_AUDIT_DATA_ANONYMIZE, concurrency: 1 },
  // ─── FAZA 8g — K48-K53 HumanNeuron HITL ──────────────────────────────────
  // K48: aprobare manuală credit depășit, SLA 4h
  { name: QUEUES.E4_HITL_CREDIT_OVERRIDE, concurrency: 5 },
  // K49: aprobare limită credit >50K RON, SLA 4h
  { name: QUEUES.E4_HITL_CREDIT_LIMIT, concurrency: 5 },
  // K50: aprobare rambursare >1K RON, SLA 4h
  { name: QUEUES.E4_HITL_REFUND_LARGE, concurrency: 5 },
  // K51: investigare plată Tier 3 no match, SLA 8h
  { name: QUEUES.E4_HITL_PAYMENT_INVESTIGATION, concurrency: 5 },
  // K52: rezolvare manuală task (UI action)
  { name: QUEUES.E4_HITL_TASK_RESOLVE, concurrency: 5 },
  // K53: escalare SLA breach overdue → CRITICAL
  { name: QUEUES.E4_HITL_ESCALATION_OVERDUE, concurrency: 5 },

  // ─── FAZA 9b — A1-A8 E5 Nurturing Lifecycle FSM ──────────────────────────
  // Redis DB: 5 (REDIS_DB_E5=5), concurrency calibrată per volum
  // A1: cross-etapa order bridge — 20 concurrent (high throughput)
  { name: QUEUES.E5_LIFECYCLE_ORDER_COMPLETED, concurrency: 20 },
  // A2: evaluare stare — 30 concurrent (periodic + signal)
  { name: QUEUES.E5_LIFECYCLE_STATE_EVALUATE, concurrency: 30 },
  // A3: start secvență onboarding — 10 concurrent
  { name: QUEUES.E5_ONBOARDING_SEQUENCE_START, concurrency: 10 },
  // A4: execuție pas onboarding (delayed jobs) — 20 concurrent
  { name: QUEUES.E5_ONBOARDING_STEP_EXECUTE, concurrency: 20 },
  // A5: verificare completare onboarding — 10 concurrent
  { name: QUEUES.E5_ONBOARDING_COMPLETE_CHECK, concurrency: 10 },
  // A6: execuție tranziție FSM — 20 concurrent
  { name: QUEUES.E5_STATE_TRANSITION_EXECUTE, concurrency: 20 },
  // A7: actualizare metrici post-tranziție — 50 concurrent (lightweight)
  { name: QUEUES.E5_STATE_METRICS_UPDATE, concurrency: 50 },
  // A8: promovare ADVOCATE — 10 concurrent
  { name: QUEUES.E5_STATE_ADVOCATE_PROMOTE, concurrency: 10 },
  // ── E5 FAZA 9c: Churn Detection AI — B9-B14 ────────────────────────────
  // B9: detectare semnale churn rule-based — 30 concurrent (fast, deterministic)
  { name: QUEUES.E5_CHURN_SIGNAL_DETECT, concurrency: 30 },
  // B10: calcul scor churn ponderat — 20 concurrent
  { name: QUEUES.E5_CHURN_SCORE_CALCULATE, concurrency: 20 },
  // B11: escalare HITL pentru CRITICAL/HIGH — 10 concurrent (SLA-sensitive)
  { name: QUEUES.E5_CHURN_RISK_ESCALATE, concurrency: 10 },
  // B12: sentiment AI — 10 concurrent (rate limit 100/min conform Plan L2249)
  { name: QUEUES.E5_SENTIMENT_ANALYZE, concurrency: 10 },
  // B13: agregare trend sentiment — 10 concurrent (heavy SQL aggregation)
  { name: QUEUES.E5_SENTIMENT_AGGREGATE, concurrency: 10 },
  // B14: detectare decay comportamental — 20 concurrent
  { name: QUEUES.E5_DECAY_BEHAVIOR_DETECT, concurrency: 20 },
  // ── E5 FAZA 9d: PostGIS Proximity Workers — C15-C19 ──────────────────────
  // C15: ST_DWithin KNN proximity calculate — 10 concurrent (PostGIS heavy, I/O bound)
  { name: QUEUES.E5_GEO_PROXIMITY_CALCULATE, concurrency: 10 },
  // C16: neighbor identify — 20 concurrent (INSERT + COUNT, lightweight)
  { name: QUEUES.E5_GEO_NEIGHBOR_IDENTIFY, concurrency: 20 },
  // C17: territory convex hull per cluster — 5 concurrent (heavy PostGIS geometry op)
  { name: QUEUES.E5_GEO_TERRITORY_CALCULATE, concurrency: 5 },
  // C18: coverage heatmap — 5 concurrent (agregare SQL per tenant)
  { name: QUEUES.E5_GEO_COVERAGE_ANALYZE, concurrency: 5 },
  // C19: catchment zones Voronoi-like — 5 concurrent (KNN per prospect set)
  { name: QUEUES.E5_GEO_CATCHMENT_BUILD, concurrency: 5 },
];

export const queueNameSet = new Set(queueRegistry.map((queue) => queue.name));

export function getQueueConfig(name: string): QueueConfig | undefined {
  return queueRegistry.find((q) => q.name === name);
}

export function isKnownQueueName(name: string): boolean {
  return QUEUE_NAME_PATTERN.test(name) && queueNameSet.has(name);
}

export function assertQueueRegistryComplete() {
  // 60 Etapa 1 queues (D0 replaces D1-D5) + 52 Etapa 2 static queues + 40 Etapa 2 per-phone queues
  // + 12 Etapa 3 E3 AI Sales queues (A1-A6 + B7-B12) = 164
  // + 20 Etapa 3 E3 queues (C13-C18 + D19-D26 + E27-E32) = 184
  // + 6 Etapa 3 E3 Stock & Inventory (F33-F38) = 190
  // + 7 Etapa 3 E3 Oblio Invoicing (G39-G45) = 197
  // + 5 Etapa 3 E3 eFactura SPV (H46-H50) = 202
  // + 5 Etapa 3 E3 Document Generation (I51-I55) = 207
  // + 5 Etapa 3 E3 Handover & Channel Routing (J56-J60) = 212
  // + 5 Etapa 3 E3 Sentiment & Intent Analysis (K61-K65) = 217
  // + 5 Etapa 3 E3 MCP Server (L66-L70) = 222
  // + 5 Etapa 3 E3 Guardrails Zero Hallucination (M71-M75) = 227
  // + 3 Etapa 3 E3 HITL Human-In-The-Loop (N76-N78) = 230
  // + 6 Etapa 4 E4 Post-Sale Revolut (A1-A6) = 236
  // + 6 Etapa 4 E4 Post-Sale Reconciliere Plăți (B7-B12) = 242
  // + 11 Etapa 4 E4 Credit Scoring 100p (C13-D21 + 2 cron) = 253
  // + 6 Etapa 4 E4 Sameday AWB + Tracking (E22-E27) = 259
  // + 5 Etapa 4 E4 Contracte DocuSign (G32-G36) = 264
  // + 4 Etapa 4 E4 Stock Sync Oblio (F28-F31) = 268
  // + 2 Etapa 4 E4 Returns (H37-H38) = 270
  // + 6 Etapa 4 E4 AlertNeuron (I39-I44) = 276
  // + 3 Etapa 4 E4 Audit Hash-Chain (J45-J47) = 279
  // + 6 Etapa 4 E4 HITL (K48-K53) = 285
  // + 8 Etapa 5 E5 Nurturing FSM A1-A8 = 293
  // + 6 Etapa 5 E5 Churn Detection B9-B14 = 299
  // + 5 Etapa 5 E5 PostGIS Proximity C15-C19 = 304
  // (ai:intent:classify removed — intent merged into ai:sentiment:analyze)
  // (AI_RESPONSE_GENERATE removed from E2 static — E3 uses separate ai:e3:response:generate)
  const expected = 304;
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
