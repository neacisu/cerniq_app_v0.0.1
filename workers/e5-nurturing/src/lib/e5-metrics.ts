/**
 * e5-metrics.ts — Metrici Prometheus E5 Nurturing Lifecycle (Plan §X FAZA 9b-9c)
 *
 * STRUCTURĂ:
 * - Metrici locale E5 (prefix cerniq_e5_) înregistrate în metricsRegistry comun
 * - Gauge nurturing_clients_by_state actualizat de A7 (state:metrics:update)
 * - Counter llm_requests_total cu model + provider (FAZA 9c Plan L2792)
 *
 * ANTI-HALUCINARE:
 * - NU re-declara metrici deja existente în @cerniq/worker-shared/metrics.ts
 * - NU duplica metrici furnizate de createWorker() (jobs_processed, jobs_failed, job_duration)
 * - Folosește metricsRegistry din @cerniq/worker-shared — pattern identic cu e4-metrics.ts
 */
import { Counter, Gauge, Histogram } from "prom-client";
import { metricsRegistry } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// GAUGE: nurturing_clients_by_state
// Distribuția clienților per stare FSM per tenant — actualizat de A7
// ---------------------------------------------------------------------------

export const nurturingClientsByState = new Gauge({
  name: "cerniq_e5_nurturing_clients_by_state",
  help: "Numărul de clienți per stare FSM nurturing (snapshot curent)",
  labelNames: ["tenant_id", "state"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// GAUGE: nurturing_onboarding_pending
// Clienți în onboarding cu pași neprocesați
// ---------------------------------------------------------------------------

export const nurturingOnboardingPending = new Gauge({
  name: "cerniq_e5_nurturing_onboarding_pending",
  help: "Clienți în stare ONBOARDING cu pași neexecutați",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// GAUGE: nurturing_at_risk_count
// Clienți în stare AT_RISK per tenant
// ---------------------------------------------------------------------------

export const nurturingAtRiskCount = new Gauge({
  name: "cerniq_e5_nurturing_at_risk_count",
  help: "Clienți în stare AT_RISK per tenant",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_llm_requests_total (Plan L2792 FAZA 9c)
// Cereri LLM per model si provider — B12 sentiment analysis
// ---------------------------------------------------------------------------

export const e5LlmRequestsTotal = new Counter({
  name: "cerniq_e5_llm_requests_total",
  help: "Total cereri LLM E5 sentiment analysis per model si provider",
  labelNames: ["model", "provider", "status"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_churn_signals_detected_total
// Semnale churn detectate per tip semnal (B9)
// ---------------------------------------------------------------------------

export const e5ChurnSignalsDetectedTotal = new Counter({
  name: "cerniq_e5_churn_signals_detected_total",
  help: "Semnale churn detectate per tip semnal si tenant",
  labelNames: ["tenant_id", "signal_type"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_churn_escalations_total
// Escalări HITL per nivel de risc (B11)
// ---------------------------------------------------------------------------

export const e5ChurnEscalationsTotal = new Counter({
  name: "cerniq_e5_churn_escalations_total",
  help: "Total escalări HITL churn per nivel de risc",
  labelNames: ["tenant_id", "risk_level"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// HISTOGRAM: e5_postgis_query_seconds (Plan §X FAZA 9d Verificare 5)
// Durata query-urilor PostGIS per tip operație (C15-C19)
// ---------------------------------------------------------------------------

export const e5PostgisQuerySeconds = new Histogram({
  name: "cerniq_e5_postgis_query_seconds",
  help: "Durata query-urilor PostGIS E5 per tip operație (ST_DWithin, ConvexHull, Coverage, Catchment)",
  labelNames: ["query_type", "tenant_id"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});
