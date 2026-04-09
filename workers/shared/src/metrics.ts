import { Counter, Gauge, Histogram, Registry } from "prom-client";

export const metricsRegistry = new Registry();

export const jobsProcessedTotal = new Counter({
  name: "cerniq_worker_jobs_processed_total",
  help: "Total processed jobs",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

export const jobsFailedTotal = new Counter({
  name: "cerniq_worker_jobs_failed_total",
  help: "Total failed jobs",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

export const jobsRetriedTotal = new Counter({
  name: "cerniq_worker_jobs_retried_total",
  help: "Total retried jobs",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

export const jobDurationSeconds = new Histogram({
  name: "cerniq_worker_job_duration_seconds",
  help: "Job duration in seconds",
  labelNames: ["queue"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [metricsRegistry],
});

export const queueDepth = new Gauge({
  name: "cerniq_worker_queue_depth",
  help: "Approx queue depth",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

export const queueDepthByState = new Gauge({
  name: "cerniq_worker_queue_depth_by_state",
  help: "Queue depth by BullMQ state",
  labelNames: ["queue", "state"],
  registers: [metricsRegistry],
});

export const dlqDepth = new Gauge({
  name: "cerniq_worker_dlq_depth",
  help: "Dead letter queue depth",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

export const jobsActiveGauge = new Gauge({
  name: "cerniq_worker_jobs_active",
  help: "Currently active jobs per queue",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

// ── Etapa 1 specific metrics ──────────────────────────────────────────────────

export const bronzeContactsIngestedTotal = new Counter({
  name: "cerniq_bronze_contacts_ingested",
  help: "Total Bronze contacts ingested (from CSV, Excel, webhook, API, manual)",
  labelNames: ["source", "tenant_id"],
  registers: [metricsRegistry],
});

export const silverEnrichmentDurationSeconds = new Histogram({
  name: "cerniq_silver_enrichment_duration_seconds",
  help: "Duration of Silver company enrichment in seconds",
  labelNames: ["source", "tenant_id"],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [metricsRegistry],
});

export const silverEnrichmentErrorsTotal = new Counter({
  name: "cerniq_silver_enrichment_errors_total",
  help: "Total Silver enrichment errors per source",
  labelNames: ["source", "tenant_id"],
  registers: [metricsRegistry],
});

export const goldCompaniesTotal = new Gauge({
  name: "cerniq_gold_companies_total",
  help: "Total Gold companies (promoted from Silver)",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

export const hitlTasksCreatedTotal = new Counter({
  name: "cerniq_hitl_tasks_created_total",
  help: "Total HITL approval tasks created",
  labelNames: ["approval_type", "tenant_id"],
  registers: [metricsRegistry],
});

export const hitlTasksResolvedTotal = new Counter({
  name: "cerniq_hitl_tasks_resolved_total",
  help: "Total HITL approval tasks resolved",
  labelNames: ["approval_type", "decision", "tenant_id"],
  registers: [metricsRegistry],
});

export const hitlResolutionTimeSeconds = new Histogram({
  name: "cerniq_hitl_resolution_time_seconds",
  help: "Time from HITL task creation to resolution in seconds",
  labelNames: ["approval_type", "tenant_id"],
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400],
  registers: [metricsRegistry],
});

export const hitlSlaBreachTotal = new Counter({
  name: "cerniq_hitl_sla_breach_total",
  help: "Total HITL tasks that breached SLA (expired without resolution)",
  labelNames: ["approval_type", "tenant_id"],
  registers: [metricsRegistry],
});

export const pipelineStageDurationSeconds = new Histogram({
  name: "cerniq_pipeline_company_stage_duration_seconds",
  help: "Duration in seconds for a company to transition between pipeline stages",
  labelNames: ["stage", "tenant_id"],
  buckets: [1, 5, 30, 60, 300, 600, 1800, 3600, 7200, 14400, 86400],
  registers: [metricsRegistry],
});

export const importMutationTotal = new Counter({
  name: "cerniq_import_mutation_total",
  help: "Total DB mutations from enrichment pipeline",
  labelNames: ["operation", "table", "tenant_id"],
  registers: [metricsRegistry],
});

// ── External API metrics ──────────────────────────────────────────────────────

export const externalApiRequestsTotal = new Counter({
  name: "cerniq_external_api_requests_total",
  help: "Total requests made to external APIs",
  labelNames: ["provider", "status"],
  registers: [metricsRegistry],
});

export const externalApiDurationSeconds = new Histogram({
  name: "cerniq_external_api_duration_seconds",
  help: "Duration of external API calls in seconds",
  labelNames: ["provider", "status"],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export const externalApiErrorsTotal = new Counter({
  name: "cerniq_external_api_errors_total",
  help: "Total errors from external APIs",
  labelNames: ["provider", "error_type"],
  registers: [metricsRegistry],
});

/**
 * Wraps an external API call with latency and error metrics.
 * @param provider - Short name for the provider (anaf, termene, hunter, etc.)
 * @param fn - The async function to instrument
 */
export async function withExternalApiMetrics<T>(
  provider: string,
  fn: () => Promise<T>,
): Promise<T> {
  const end = externalApiDurationSeconds.startTimer({ provider });
  try {
    const result = await fn();
    externalApiRequestsTotal.inc({ provider, status: "success" });
    end({ status: "success" });
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.toLowerCase() : String(err);
    let errorType = "unknown";
    if (message.includes("timeout") || message.includes("etimedout")) errorType = "timeout";
    else if (message.includes("rate") || message.includes("429")) errorType = "rate_limited";
    else if (message.includes("401") || message.includes("403") || message.includes("unauthorized"))
      errorType = "auth";
    else if (message.includes("404") || message.includes("not found")) errorType = "not_found";
    else if (message.includes("circuit") && message.includes("open")) errorType = "circuit_open";
    else if (
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("5")
    )
      errorType = "network";
    externalApiRequestsTotal.inc({ provider, status: "error" });
    externalApiErrorsTotal.inc({ provider, error_type: errorType });
    end({ status: errorType });
    throw err;
  }
}

// ── Etapa 2 / cognitive outreach observability ────────────────────────────────

export const outreachDispatched = new Counter({
  name: "cerniq_cognitive_outreach_dispatched",
  help: "Total outreach dispatches",
  labelNames: ["channel"],
  registers: [metricsRegistry],
});

export const waSent = new Counter({
  name: "cerniq_cognitive_wa_sent",
  help: "Total WhatsApp messages sent",
  labelNames: ["phone_id"],
  registers: [metricsRegistry],
});

export const fsmTransitions = new Counter({
  name: "cerniq_cognitive_fsm_transitions",
  help: "FSM state transitions",
  labelNames: ["from", "to"],
  registers: [metricsRegistry],
});

// ── Etapa 2 / outreach operational metrics ────────────────────────────────────

/**
 * Gauge — utilizare cotă WA per telefon.
 * Setat după fiecare verificare Redis quota (executeQuotaCheck).
 * Permite vizualizarea Grafana a utilizării reale vs limita zilnică.
 */
export const outreachWaQuotaUsage = new Gauge({
  name: "cerniq_outreach_wa_quota_usage",
  help: "Current WA quota usage per phone (vs daily limit)",
  labelNames: ["phone_id", "tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter — mesaje outreach trimise per canal.
 * Incrementat după trimitere reușită (WA/EMAIL_COLD/EMAIL_WARM).
 */
export const outreachMessagesSentTotal = new Counter({
  name: "cerniq_outreach_messages_sent_total",
  help: "Total outreach messages sent per channel",
  labelNames: ["channel", "tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Gauge — starea curentă a unui telefon WA.
 * 1 = ACTIVE, 0 = orice alt status (OFFLINE/BANNED/SUSPENDED).
 * Actualizat de phone-monitoring worker la fiecare health check.
 */
export const outreachPhoneStatus = new Gauge({
  name: "cerniq_outreach_phone_status",
  help: "WA phone status (1=ACTIVE, 0=not-active) per phone",
  labelNames: ["phone_id", "status", "tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter — răspunsuri primite de la lead-uri, per canal.
 * Incrementat la recepție webhook INBOUND (TimelinesAI/Instantly/Resend).
 */
export const outreachRepliesReceivedTotal = new Counter({
  name: "cerniq_outreach_replies_received_total",
  help: "Total inbound replies received per channel",
  labelNames: ["channel", "tenant_id"],
  registers: [metricsRegistry],
});

// ── Etapa 3 — E3 AI Sales guardrail observability ────────────────────────────

/**
 * Counter — breach-uri guardrail DETERMINISTIC (M71-M75).
 * Sursă pentru alertă HighHallucinationRate >10%/5min (plan L8701).
 * Utilizat de N76 (human:escalate) și N77 (human:takeover) pentru
 * semnalizarea escaladărilor AI → uman în workflow-ul HITL E3.
 * Exportat din @cerniq/worker-shared pentru rezolvare corectă TypeScript LSP.
 */
export const aiGuardrailBreachesTotal = new Counter({
  name: "cerniq_ai_guardrail_breaches_total",
  help: "Total AI guardrail violations detected (M71-M75 deterministic checks)",
  labelNames: ["guardrail_type", "severity"] as const,
  registers: [metricsRegistry],
});

// ── Etapa 4 — E4 Post-Sale Revolut observability ─────────────────────────────

/**
 * Gauge — soldul curent per cont Revolut Business.
 * Actualizat de A5 (revolut:balance:sync) cron la fiecare 30 minute.
 * Permite alerte Grafana la diferențe >threshold față de snapshot anterior.
 * Plan FAZA 8b §XII A5.
 */
export const e4RevolutBalanceGauge = new Gauge({
  name: "cerniq_etapa4_revolut_balance",
  help: "Revolut Business account balance per account (E4 A5 sync)",
  labelNames: ["account_id", "currency", "tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter — webhook-uri Revolut procesate per tip eveniment.
 * Incrementat în A1 (revolut:webhook:ingest) la ingestie reușită.
 */
export const e4RevolutWebhooksTotal = new Counter({
  name: "cerniq_etapa4_revolut_webhooks_total",
  help: "Total Revolut webhooks ingested by event type",
  labelNames: ["event_type", "action"],
  registers: [metricsRegistry],
});

/**
 * Counter — plăți înregistrate Revolut (A3).
 * Incrementat la INSERT gold_payments cu externalSource='REVOLUT'.
 */
export const e4RevolutPaymentsRecordedTotal = new Counter({
  name: "cerniq_etapa4_revolut_payments_recorded_total",
  help: "Total Revolut payments recorded in gold_payments",
  labelNames: ["currency", "tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter — validări HMAC A6.
 * Label status: 'valid' | 'invalid' — pentru alertă SecurityEvent.
 */
export const e4RevolutHmacValidationsTotal = new Counter({
  name: "cerniq_etapa4_revolut_hmac_validations_total",
  help: "Total Revolut webhook HMAC-SHA256 validations (A6)",
  labelNames: ["status"],
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// E4 — Reconciliere Plăți Three-Tier (B7-B12)
// Plan FAZA 8c §IX L2037-2047
// ---------------------------------------------------------------------------

/**
 * Histogram — durată reconciliere plăți per match_type.
 * Înregistrat în B7 (Tier1), B8 (Tier2), B9 (Tier3).
 * Label match_type: 'EXACT_REFERENCE' | 'FUZZY_NAME_AMOUNT' | 'MANUAL' | 'UNMATCHED'
 */
export const e4ReconciliationDurationSeconds = new Histogram({
  name: "cerniq_etapa4_payments_reconciliation_duration_seconds",
  help: "Duration of payment reconciliation processing per match type",
  labelNames: ["match_type", "tenant_id"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

/**
 * Counter — reconcilieri per match_type și result.
 * Label result: 'matched' | 'enqueued_fuzzy' | 'enqueued_manual' | 'unmatched'
 */
export const e4ReconciliationTotal = new Counter({
  name: "cerniq_etapa4_reconciliation_total",
  help: "Total payment reconciliation attempts per match type and result",
  labelNames: ["match_type", "result", "tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter — comenzi overdue detectate de B11 (cron 0 9 * * *).
 */
export const e4OverdueOrdersDetectedTotal = new Counter({
  name: "cerniq_etapa4_overdue_orders_detected_total",
  help: "Total overdue orders detected by B11 cron",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter — comenzi overdue escalate de B12 (alerte graduated).
 * Label severity: 'WARNING' | 'REMINDER' | 'CRITICAL'
 */
export const e4OverdueOrdersEscalatedTotal = new Counter({
  name: "cerniq_etapa4_overdue_orders_escalated_total",
  help: "Total overdue order escalations by severity level",
  labelNames: ["severity", "tenant_id"],
  registers: [metricsRegistry],
});

// ============================================================================
// ETAPA 4 — Credit Scoring 100p (C13-D21)
// Plan FAZA 8d §IX L2048-2070
// ============================================================================

/**
 * Histogram durata calculare scor credit (C17).
 * Label tenant_id pentru multi-tenancy.
 */
export const e4CreditScoringDurationSeconds = new Histogram({
  name: "cerniq_etapa4_credit_scoring_duration_seconds",
  help: "Duration of credit score calculation (C17) in seconds",
  buckets: [0.05, 0.1, 0.5, 1, 2, 5, 10],
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter total scoruri calculate, pe risk_tier rezultat.
 */
export const e4CreditScoreCalculatedTotal = new Counter({
  name: "cerniq_etapa4_credit_score_calculated_total",
  help: "Total credit scores calculated, by resulting risk tier",
  labelNames: ["risk_tier", "tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter verificări limită credit D19, pe result (approved/rejected).
 */
export const e4CreditLimitChecksTotal = new Counter({
  name: "cerniq_etapa4_credit_limit_checks_total",
  help: "Total D19 credit limit checks, by result",
  labelNames: ["result", "tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter rezervări credit (D20/D21/expire), pe action.
 * Label action: 'reserve' | 'release' | 'expire'
 */
export const e4CreditReservationsTotal = new Counter({
  name: "cerniq_etapa4_credit_reservations_total",
  help: "Total credit reservation actions (reserve/release/expire)",
  labelNames: ["action", "tenant_id"],
  registers: [metricsRegistry],
});

// ============================================================================
// ETAPA 4 — Sameday Logistics AWB + Tracking (E22-E27)
// Plan FAZA 8e §IX L2072-2087
// ============================================================================

/**
 * Counter expedieri create (E22: sameday:awb:create), pe carrier și tenant.
 * Label carrier: 'SAMEDAY' | 'FAN_COURIER' | ...
 * Plan: cerniq_etapa4_shipments_created_total{carrier="SAMEDAY"}
 */
export const e4ShipmentsCreatedTotal = new Counter({
  name: "cerniq_etapa4_shipments_created_total",
  help: "Total AWB shipments created, by carrier",
  labelNames: ["carrier", "tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter schimbări de status livrare (E24: sameday:status:process), pe status și tenant.
 * Label status: 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELIVERY_FAILED' | 'RETURNED'
 */
export const e4ShipmentStatusChangesTotal = new Counter({
  name: "cerniq_etapa4_shipment_status_changes_total",
  help: "Total shipment status transitions processed by E24",
  labelNames: ["status", "tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter colectări COD procesate (E25: sameday:cod:process), pe tenant.
 */
export const e4CodCollectionsTotal = new Counter({
  name: "cerniq_etapa4_cod_collections_total",
  help: "Total COD (cash-on-delivery) collections processed by E25",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter returnări inițiate automat (E26: sameday:return:initiate), pe tenant.
 * Trigger: 3× DELIVERY_FAILED
 */
export const e4ShipmentReturnsTotal = new Counter({
  name: "cerniq_etapa4_shipment_returns_total",
  help: "Total auto-initiated shipment returns (3x DELIVERY_FAILED threshold)",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Histogram durată batch E23 (sameday:status:poll) — nr. expedieri procesate per ciclu.
 */
export const e4SamedayPollBatchSize = new Histogram({
  name: "cerniq_etapa4_sameday_poll_batch_size",
  help: "Number of active SAMEDAY shipments processed per E23 poll cycle",
  buckets: [0, 1, 5, 10, 25, 50, 100, 250, 500],
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

// =============================================================================
// FAZA 8f — G32-G36 Contracte DocuSign
// =============================================================================

/**
 * Counter contracte generate (G32: contract:generate), pe tenant + risk_tier.
 */
export const e4ContractsGeneratedTotal = new Counter({
  name: "cerniq_etapa4_contracts_generated_total",
  help: "Total contracts generated (DOCX → PDF) by G32",
  labelNames: ["tenant_id", "risk_tier"],
  registers: [metricsRegistry],
});

/**
 * Counter contracte semnate (G36: contract:signed:process), pe tenant.
 */
export const e4ContractsSignedTotal = new Counter({
  name: "cerniq_etapa4_contracts_signed_total",
  help: "Total contracts signed (DocuSign status=signed) by G36",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter alerte expirare contracte (G35: contract:status:poll, expiresAt < NOW()+24h).
 */
export const e4ContractExpiryAlertsTotal = new Counter({
  name: "cerniq_etapa4_contract_expiry_alerts_total",
  help: "Total contract expiry alerts raised by G35 (expiresAt within 24h)",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

// =============================================================================
// FAZA 8g — F28-F31 Stock, H37-H38 Returns, I39-I44 Alerts, J45-J47 Audit, K48-K53 HITL
// =============================================================================

/**
 * Gauge integritate lanț audit (J46: audit:chain:verify).
 * 1 = OK, 0 = BROKEN — monitorizat ca alert CRITICAL AuditChainIntegrity (Plan L2167).
 */
export const e4AuditChainIntegrityGauge = new Gauge({
  name: "cerniq_etapa4_audit_chain_integrity",
  help: "Audit chain integrity status per tenant (1=OK, 0=BROKEN), updated by J46",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter task-uri HITL create de workerii K48-K53.
 */
export const e4HitlTasksCreatedTotal = new Counter({
  name: "cerniq_etapa4_hitl_tasks_created_total",
  help: "Total HITL approval tasks created by E4 HITL workers K48-K53",
  labelNames: ["tenant_id", "task_type", "priority"],
  registers: [metricsRegistry],
});

/**
 * Counter sincronizări stoc Oblio (F28: stock:sync:oblio).
 */
export const e4StockSyncTotal = new Counter({
  name: "cerniq_etapa4_stock_sync_total",
  help: "Total stock items synced from Oblio ERP by F28",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter deduceri stoc la DELIVERED (F29: stock:deduct).
 */
export const e4StockDeductionsTotal = new Counter({
  name: "cerniq_etapa4_stock_deductions_total",
  help: "Total stock deductions (on order DELIVERED) by F29",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter retururi stoc la RETURNED (F30: stock:return).
 */
export const e4StockReturnsTotal = new Counter({
  name: "cerniq_etapa4_stock_returns_total",
  help: "Total stock returns (on order RETURNED) by F30",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter alerte stoc scăzut (F31: stock:low:alert).
 */
export const e4StockAlertsTotal = new Counter({
  name: "cerniq_etapa4_stock_alerts_total",
  help: "Total low-stock alerts generated by F31",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

/**
 * Counter alerte dispatched (I39-I44: alert:* workers).
 */
export const e4AlertsDispatchedTotal = new Counter({
  name: "cerniq_etapa4_alerts_dispatched_total",
  help: "Total alerts dispatched by I39-I44 alert workers",
  labelNames: ["tenant_id", "alert_type"],
  registers: [metricsRegistry],
});

// =============================================================================
// FAZA 13 — LLM infraq.app (Plan §XIII L9645-9657)
// =============================================================================

/** Apeluri LLM către gateway-ul self-hosted sau înregistrări echivalente. */
export const llmRequestsTotal = new Counter({
  name: "cerniq_llm_requests_total",
  help: "Total LLM API requests (infraq self-hosted primary)",
  labelNames: ["model_id", "task_type", "status", "is_selfhosted"],
  registers: [metricsRegistry],
});

export const llmLatencySeconds = new Histogram({
  name: "cerniq_llm_latency_seconds",
  help: "LLM request latency in seconds",
  labelNames: ["model_id", "task_type"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [metricsRegistry],
});

export const llmTokensTotal = new Counter({
  name: "cerniq_llm_tokens_total",
  help: "Total LLM tokens reported by OpenAI-compatible usage blocks",
  labelNames: ["model_id", "type"],
  registers: [metricsRegistry],
});

/** Înregistrat de workeri la fallback frontier (xAI, OpenAI, etc.), nu de fetch-ul infraq. */
export const llmFallbackTotal = new Counter({
  name: "cerniq_llm_fallback_total",
  help: "Total fallback activations from infraq primary to frontier models",
  labelNames: ["frontier_model", "reason"],
  registers: [metricsRegistry],
});

/** Cost estimat plătit către furnizori frontier; self-hosted = 0 (opțional, apel explicit). */
export const llmCostUsdTotal = new Counter({
  name: "cerniq_llm_cost_usd_total",
  help: "Accumulated LLM cost in USD by provider and tenant",
  labelNames: ["provider", "tenant_id"],
  registers: [metricsRegistry],
});

export function recordLlmFallback(
  frontierModel: string,
  reason: "error" | "timeout" | "ratelimit",
) {
  llmFallbackTotal.inc({ frontier_model: frontierModel, reason });
}

export function recordLlmCostUsd(provider: string, tenantId: string, costUsd: number) {
  if (costUsd < 0) return;
  if (costUsd === 0 && provider === "infraq") return;
  llmCostUsdTotal.inc({ provider, tenant_id: tenantId }, costUsd);
}

// =============================================================================
// FAZA 13 — LLM Guard (infraq.app) + regenerări output (Plan §XIII L9652-9656)
// =============================================================================

/** Violări raportate când `is_valid=false` (sau erori de scanare), per scanner. */
export const llmGuardViolationsTotal = new Counter({
  name: "cerniq_llmguard_violations_total",
  help: "Total LLM Guard scanner signals (input/output scan failures)",
  labelNames: ["scanner_name", "is_input"],
  registers: [metricsRegistry],
});

export const llmGuardLatencySeconds = new Histogram({
  name: "cerniq_llmguard_latency_seconds",
  help: "LLM Guard HTTP scan latency in seconds",
  labelNames: ["phase"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

/**
 * Distribuție număr de încercări de regenerare după eșec scan output (1 = fără regenerare).
 * Label guardrail_type: ex. llm_guard_output (Plan §XIII).
 */
export const llmRegenerationAttempts = new Histogram({
  name: "cerniq_llm_regeneration_attempts",
  help: "Histogram of LLM output regeneration rounds after guard failure",
  labelNames: ["guardrail_type"],
  buckets: [0, 1, 2, 3, 4, 5],
  registers: [metricsRegistry],
});

/** Blocări la plafon zilnic LLM (100% cap) — înainte de apeluri frontier. */
export const llmCostCeilingBlocksTotal = new Counter({
  name: "cerniq_llm_cost_ceiling_blocks_total",
  help: "Blocks when daily LLM spend reached hard cap (no frontier calls)",
  labelNames: ["tier"],
  registers: [metricsRegistry],
});

/** Blocări la „spike” orar cheltuială frontier — forțează self-hosted / HITL (Plan §XIII). */
export const llmCostSpikeBlocksTotal = new Counter({
  name: "cerniq_llm_cost_spike_blocks_total",
  help: "Blocks when hourly frontier LLM spend exceeded spike cap (circuit breaker)",
  labelNames: ["tier"],
  registers: [metricsRegistry],
});

/** Divergență consensus 3-modele → HITL recomandat (Plan §XIII). */
export const llmConsensusDivergenceTotal = new Counter({
  name: "cerniq_llm_consensus_divergence_total",
  help: "Consensus vote failed majority agreement across frontier/infraq models",
  labelNames: ["trigger"],
  registers: [metricsRegistry],
});

/**
 * Allocator telefoane WA — path SKIP LOCKED (fără Redis phone:lock).
 * outcome=acquired|exhausted
 */
/** Alias plan: `phone_allocator_contention_total` — același counter ca în registrele Prometheus. */
export const phoneAllocatorContentionTotal = new Counter({
  name: "cerniq_phone_allocator_contention_total",
  help: "Phone allocator outcomes (FOR UPDATE SKIP LOCKED); label outcome=acquired|exhausted",
  labelNames: ["outcome"],
  registers: [metricsRegistry],
});

/** Rată mesaje WA blocate (status BLOCKED) în fereastra de reputație — 0..1. */
export const phoneBlockRateGauge = new Gauge({
  name: "cerniq_phone_block_rate",
  help: "WhatsApp outbound block rate in phone reputation window (0-1)",
  labelNames: ["tenant_id", "phone_id"],
  registers: [metricsRegistry],
});

/** @deprecated Folosiți `phoneAllocatorContentionTotal` (nume metrică aliniat planului). */
export const outreachPhoneAllocatorContentionTotal = phoneAllocatorContentionTotal;
