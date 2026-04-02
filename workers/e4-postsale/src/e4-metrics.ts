/**
 * e4-metrics.ts — Metrici Prometheus E4 Post-Sale (Plan §IX L2141-2155)
 *
 * STRUCTURĂ:
 * 1. Re-exporturi din @cerniq/worker-shared (metrici declarate în metrics.ts)
 * 2. Metrici noi declarate LOCAL (prefix cerniq_etapa4_) — cele lipsă din plan
 *
 * ANTI-HALUCINARE:
 * - Prefix EXACT: `cerniq_etapa4_` (nu cerniq_e4_ sau alt format)
 * - Labels EXACTE din plan — nu adăuga labels suplimentare
 * - NU duplica metrici deja furnizate de createWorker() (jobs_processed, jobs_failed, job_duration)
 * - NU re-declara metrici deja existente în @cerniq/worker-shared/metrics.ts
 */
import { Counter, Gauge, Histogram } from "prom-client";
import { metricsRegistry } from "@cerniq/worker-shared";

// ── Re-exporturi din @cerniq/worker-shared ────────────────────────────────────
export {
  e4RevolutBalanceGauge,
  e4RevolutWebhooksTotal,
  e4RevolutPaymentsRecordedTotal,
  e4RevolutHmacValidationsTotal,
  e4ReconciliationDurationSeconds,
  e4ReconciliationTotal,
  e4OverdueOrdersDetectedTotal,
  e4OverdueOrdersEscalatedTotal,
  e4CreditScoringDurationSeconds,
  e4CreditScoreCalculatedTotal,
  e4CreditLimitChecksTotal,
  e4CreditReservationsTotal,
  // FAZA 8e — Sameday AWB + Tracking (E22-E27)
  e4ShipmentsCreatedTotal,
  e4ShipmentStatusChangesTotal,
  e4CodCollectionsTotal,
  e4ShipmentReturnsTotal,
  e4SamedayPollBatchSize,
  // FAZA 8f — Contracte DocuSign (G32-G36)
  e4ContractsGeneratedTotal,
  e4ContractsSignedTotal,
  e4ContractExpiryAlertsTotal,
  // FAZA 8g — Stock, Returns, Alerts, Audit Hash-Chain, HITL
  e4AuditChainIntegrityGauge,
  e4HitlTasksCreatedTotal,
  e4StockSyncTotal,
  e4StockDeductionsTotal,
  e4StockReturnsTotal,
  e4StockAlertsTotal,
  e4AlertsDispatchedTotal,
} from "@cerniq/worker-shared";

// =============================================================================
// METRICI NOI — lipsă din @cerniq/worker-shared, cerute de Plan §IX L2141-2155
// Toate folosesc aceeași metricsRegistry → expuse pe /metrics via createHealthServer
// =============================================================================

// ── Counters ─────────────────────────────────────────────────────────────────

/**
 * Counter ordine create (A3: revolut:payment:record → gold_payments INSERT).
 * Plan §IX L2141: {tenant_id, payment_method, status}
 */
export const e4OrdersCreatedTotal = new Counter({
  name: "cerniq_etapa4_orders_created_total",
  help: "Total E4 payment orders created (A3 revolut:payment:record INSERT gold_payments)",
  labelNames: ["tenant_id", "payment_method", "status"] as const,
  registers: [metricsRegistry],
});

/**
 * Counter valoare totală ordine (A3).
 * Plan §IX L2142: {tenant_id, currency}
 */
export const e4OrdersValueTotal = new Counter({
  name: "cerniq_etapa4_orders_value_total",
  help: "Total monetary value of E4 payment orders recorded by A3, in currency units",
  labelNames: ["tenant_id", "currency"] as const,
  registers: [metricsRegistry],
});

/**
 * Counter plăți primite (A3: după INSERT gold_payments PENDING).
 * Plan §IX L2143: {tenant_id, source, reconciliation_status}
 */
export const e4PaymentsReceivedTotal = new Counter({
  name: "cerniq_etapa4_payments_received_total",
  help: "Total payments received and recorded, by source and initial reconciliation status",
  labelNames: ["tenant_id", "source", "reconciliation_status"] as const,
  registers: [metricsRegistry],
});

/**
 * Counter apeluri API externe E4 (Revolut, Sameday, DocuSign, Termene, ANAF).
 * Plan §IX L2146: {service, endpoint, status}
 */
export const e4ExternalApiCallsTotal = new Counter({
  name: "cerniq_etapa4_external_api_calls_total",
  help: "Total E4 external API calls to Revolut, Sameday, DocuSign, Termene, ANAF",
  labelNames: ["service", "endpoint", "status"] as const,
  registers: [metricsRegistry],
});

// ── Histograms ────────────────────────────────────────────────────────────────

/**
 * Histogram timp livrare expediere (E24: DELIVERED - createdAt delta).
 * Plan §IX L2148: {carrier, delivery_type} — buckets: [4, 8, 12, 24, 48, 72, 168] ore
 */
export const e4ShipmentDeliveryTimeHours = new Histogram({
  name: "cerniq_etapa4_shipment_delivery_time_hours",
  help: "Time from AWB creation to DELIVERED status, in hours (E24 sameday:status:process)",
  labelNames: ["carrier", "delivery_type"] as const,
  buckets: [4, 8, 12, 24, 48, 72, 168],
  registers: [metricsRegistry],
});

/**
 * Histogram timp rezolvare task HITL (K52: hitl:task:resolve).
 * Plan §IX L2149: {task_type, decision} — buckets: [300, 900, 1800, 3600, 14400, 28800] secunde
 */
export const e4HitlResolutionTimeSeconds = new Histogram({
  name: "cerniq_etapa4_hitl_resolution_time_seconds",
  help: "Time from HITL task creation to resolution (K52 hitl:task:resolve), in seconds",
  labelNames: ["task_type", "decision"] as const,
  buckets: [300, 900, 1800, 3600, 14400, 28800],
  registers: [metricsRegistry],
});

/**
 * Histogram durată apeluri API externe E4, pe serviciu.
 * Plan §IX L2150: {service} — buckets: [0.1, 0.5, 1, 2, 5, 10] secunde
 * NOTE: Distinct de cerniq_external_api_duration_seconds (generic shared) — prefix etapa4 E4-specific.
 */
export const e4ExternalApiDurationSeconds = new Histogram({
  name: "cerniq_etapa4_external_api_duration_seconds",
  help: "Duration of E4 external API calls (Revolut, Sameday, DocuSign, Termene, ANAF), in seconds",
  labelNames: ["service"] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

// ── Gauges ────────────────────────────────────────────────────────────────────

/**
 * Gauge distribuție scoruri credit per risk_tier (C17: credit:score:calculate).
 * Plan §IX L2152: {tenant_id, risk_tier}
 * Valoare = numărul de clienți activi cu acel tier.
 */
export const e4CreditScoreDistribution = new Gauge({
  name: "cerniq_etapa4_credit_score_distribution",
  help: "Count of active clients per credit risk tier (C17 scoring output)",
  labelNames: ["tenant_id", "risk_tier"] as const,
  registers: [metricsRegistry],
});

/**
 * Gauge rata utilizare credit per client (D19/D20: credit:limit:reserve/check).
 * Plan §IX L2153: {tenant_id, client_id}
 * Valoare = reservedAmount / creditLimit ∈ [0, 1]
 */
export const e4CreditUtilizationRatio = new Gauge({
  name: "cerniq_etapa4_credit_utilization_ratio",
  help: "Credit utilization ratio per client (reserved/limit), updated by D19/D20",
  labelNames: ["tenant_id", "client_id"] as const,
  registers: [metricsRegistry],
});

/**
 * Gauge task-uri HITL pending (K48-K53 + K52 resolve).
 * Plan §IX L2154: {tenant_id, task_type}
 * Alert: HITLQueueBacklog > 20 for 30m.
 */
export const e4HitlTasksPending = new Gauge({
  name: "cerniq_etapa4_hitl_tasks_pending",
  help: "Current count of unresolved HITL approval tasks, by type (K48-K53 lifecycle)",
  labelNames: ["tenant_id", "task_type"] as const,
  registers: [metricsRegistry],
});
