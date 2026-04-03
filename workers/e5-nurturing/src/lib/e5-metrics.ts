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

// ---------------------------------------------------------------------------
// HISTOGRAM: e5_graph_build_seconds (D20 — build relationship graph DB query)
// Durata construirii grafului de relații (noduri+muchii) din DB — NU leiden
// ---------------------------------------------------------------------------

export const e5GraphBuildSeconds = new Histogram({
  name: "cerniq_e5_graph_build_seconds",
  help: "Durata construirii grafului de relații D20 (query DB orders+referrals) per tenant",
  labelNames: ["tenant_id"] as const,
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// HISTOGRAM: e5_leiden_python_seconds (D21 — execuție Python Leiden algorithm)
// Durata apelului Python leiden detectare comunități — buckets până la 600s
// ---------------------------------------------------------------------------

export const e5LeidenPythonSeconds = new Histogram({
  name: "cerniq_e5_leiden_python_seconds",
  help: "Durata execuției algoritmului Leiden în Python (D21) per acțiune și tenant",
  labelNames: ["action", "tenant_id"] as const,
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// GAUGE: e5_kol_profiles_total (D23 — KOL identification)
// Numărul de profiluri KOL identificate per tenant și tier (micro/macro/mega)
// ---------------------------------------------------------------------------

export const e5KolProfilesTotal = new Gauge({
  name: "cerniq_e5_kol_profiles_total",
  help: "Numărul de profiluri Key Opinion Leader identificate per tenant și tier",
  labelNames: ["tenant_id", "tier"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// GAUGE: e5_communities_detected_total (D21 — Leiden community detection)
// Numărul de comunități detectate per tenant și metodă algoritmică
// ---------------------------------------------------------------------------

export const e5CommunitiesDetected = new Gauge({
  name: "cerniq_e5_communities_detected_total",
  help: "Numărul de comunități detectate per tenant și metodă (leiden/modularity/label-propagation)",
  labelNames: ["tenant_id", "method"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_referrals_created_total (E25-E31 — referral pipeline)
// Total referaluri create per tenant și tip (organic/incentivized/advocate)
// ---------------------------------------------------------------------------

export const e5ReferralsCreatedTotal = new Counter({
  name: "cerniq_e5_referrals_created_total",
  help: "Total referaluri create per tenant și tip (organic/incentivized/advocate)",
  labelNames: ["tenant_id", "referral_type"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// GAUGE: e5_winback_campaigns_active (F32-F36 — win-back campaigns)
// Campanii win-back active per tenant și tip campanie
// ---------------------------------------------------------------------------

export const e5WinbackCampaignsActive = new Gauge({
  name: "cerniq_e5_winback_campaigns_active",
  help: "Campanii win-back active per tenant și tip campanie (email/sms/call/mixed)",
  labelNames: ["tenant_id", "campaign_type"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_association_entries_scraped_total (G37-G38 — association scraping)
// Total intrări scrape asociații profesionale OUAI/MADR per sursă
// ---------------------------------------------------------------------------

export const e5AssociationEntriesScrapedTotal = new Counter({
  name: "cerniq_e5_association_entries_scraped_total",
  help: "Total intrări asociații profesionale scrape per sursă (ouai/madr) și stare",
  labelNames: ["source", "status"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_association_member_matches_total (G41 — association member matching)
// Total potriviri membri asociații cu clienți CerniqApp per tenant
// ---------------------------------------------------------------------------

export const e5AssociationMemberMatchesTotal = new Counter({
  name: "cerniq_e5_association_member_matches_total",
  help: "Total potriviri membri asociații cu clienți per tenant și metodă (exact/fuzzy/cui)",
  labelNames: ["tenant_id", "match_method"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_nps_score_recorded_total (H44 — NPS processing)
// Total scoruri NPS înregistrate per categorie și tenant (promotor/pasiv/detractor)
// ---------------------------------------------------------------------------

export const e5NpsScoreRecorded = new Counter({
  name: "cerniq_e5_nps_score_recorded_total",
  help: "Total scoruri NPS înregistrate per categorie (promotor/pasiv/detractor) și tenant",
  labelNames: ["category", "tenant_id"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// GAUGE: e5_nps_score_avg (sursă alertă LowNPSScore < 6)
// Scorul NPS mediu curent per tenant (rolling 30d)
// ---------------------------------------------------------------------------

export const e5NpsScoreAvg = new Gauge({
  name: "cerniq_e5_nps_score_avg",
  help: "Scorul NPS mediu curent per tenant (rolling 30 zile) — alertă când < 6",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_nps_distribution_total (H44 — NPS score distribution histogram)
// Distribuția scorurilor NPS per categorie (0-6 detractor, 7-8 pasiv, 9-10 promotor)
// ---------------------------------------------------------------------------

export const e5NpsDistribution = new Counter({
  name: "cerniq_e5_nps_distribution_total",
  help: "Distribuția scorurilor NPS per categorie (detractor/pasiv/promotor)",
  labelNames: ["category"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_content_drips_enqueued_total (I48-I49 — content drip campaign)
// Total mesaje drip enqueued per tenant pentru campanii de nurturing content
// ---------------------------------------------------------------------------

export const e5ContentDripsEnqueued = new Counter({
  name: "cerniq_e5_content_drips_enqueued_total",
  help: "Total mesaje content drip enqueued per tenant și tip conținut",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_weather_alerts_processed_total (J52-J55 — weather alerts)
// Total alerte meteo procesate per severitate și tip alertă agri
// ---------------------------------------------------------------------------

export const e5WeatherAlertsProcessed = new Counter({
  name: "cerniq_e5_weather_alerts_processed_total",
  help: "Total alerte meteo procesate per severitate (low/medium/high/critical) și tip alertă",
  labelNames: ["severity", "alert_type"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_compliance_violations_total (K56-K58 — GDPR + competition law)
// Total violări compliance detectate per tip (gdpr/competition/retention)
// ---------------------------------------------------------------------------

export const e5ComplianceViolationsTotal = new Counter({
  name: "cerniq_e5_compliance_violations_total",
  help: "Total violări compliance detectate per tip (gdpr/competition/retention) și tenant",
  labelNames: ["violation_type", "tenant_id"] as const,
  registers: [metricsRegistry],
});

// ===========================================================================
// METRICI FAZA 9j — Indicatori de Business E5 (Plan L2345-L2373)
// Metrici de nivel business pentru alerting și dashboarding Grafana E5
// ===========================================================================

// ---------------------------------------------------------------------------
// GAUGE: e5_nurturing_clients_at_risk (sursă alertă HighChurnRiskClients)
// Clienți în stare de risc churn per tenant și nivel risc
// ---------------------------------------------------------------------------

export const nurturingClientsAtRisk = new Gauge({
  name: "cerniq_e5_nurturing_clients_at_risk",
  help: "Clienți cu risc churn ridicat per tenant și nivel risc (low/medium/high/critical)",
  labelNames: ["tenant_id", "risk_level"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// GAUGE: e5_nurturing_referral_conversion_rate (sursă alertă ReferralConversionDrop)
// Rata de conversie referaluri per tenant (referaluri convertite / total trimise)
// ---------------------------------------------------------------------------

export const nurturingReferralConversionRate = new Gauge({
  name: "cerniq_e5_nurturing_referral_conversion_rate",
  help: "Rata de conversie referaluri per tenant (0.0-1.0) — alertă când < 0.05",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// GAUGE: e5_nurturing_cluster_penetration (penetrare cluster social-geografic)
// Penetrarea clusterelor identificate per tenant și tip cluster
// ---------------------------------------------------------------------------

export const nurturingClusterPenetration = new Gauge({
  name: "cerniq_e5_nurturing_cluster_penetration",
  help: "Penetrarea clusterelor identificate per tenant și tip cluster (geographic/social/professional)",
  labelNames: ["tenant_id", "cluster_type"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// GAUGE: e5_nurturing_winback_success_rate (rata succes campanii win-back)
// Rata de succes campanii win-back per tenant
// ---------------------------------------------------------------------------

export const nurturingWinbackSuccessRate = new Gauge({
  name: "cerniq_e5_nurturing_winback_success_rate",
  help: "Rata de succes campanii win-back per tenant (0.0-1.0)",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_nurturing_referral_revenue_total (revenue generat prin referaluri)
// Revenue total generat prin programul de referaluri per tenant (RON)
// ---------------------------------------------------------------------------

export const nurturingReferralRevenueTotal = new Counter({
  name: "cerniq_e5_nurturing_referral_revenue_total",
  help: "Revenue total generat prin programul de referaluri per tenant (RON)",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// HISTOGRAM: e5_nurturing_churn_score (distribuție ChurnScore 0-100)
// Distribuția scorurilor churn per tenant și nivel risc — 10 buckets 10-100
// ---------------------------------------------------------------------------

export const nurturingChurnScore = new Histogram({
  name: "cerniq_e5_nurturing_churn_score",
  help: "Distribuția scorurilor churn per tenant și nivel risc (0-100 scala)",
  labelNames: ["tenant_id", "risk_level"] as const,
  buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_etapa5_llm_tokens_total (consum tokeni LLM E5)
// Total tokeni LLM consumați per model și tip (prompt/completion)
// ---------------------------------------------------------------------------

export const etapa5LlmTokensTotal = new Counter({
  name: "cerniq_e5_etapa5_llm_tokens_total",
  help: "Total tokeni LLM consumați per model și tip (prompt/completion) în E5",
  labelNames: ["model", "type"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_etapa5_hitl_tasks_created_total (task-uri HITL create)
// Total task-uri HITL create per tip și prioritate în E5
// ---------------------------------------------------------------------------

export const etapa5HitlTasksCreatedTotal = new Counter({
  name: "cerniq_e5_etapa5_hitl_tasks_created_total",
  help: "Total task-uri HITL create per tip și prioritate în E5 (winback/complaint/referral)",
  labelNames: ["task_type", "priority"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// COUNTER: e5_etapa5_hitl_sla_breaches_total (breșe SLA HITL)
// Total breșe SLA task-uri HITL per tip și prioritate în E5
// ---------------------------------------------------------------------------

export const etapa5HitlSlaBreachesTotal = new Counter({
  name: "cerniq_e5_etapa5_hitl_sla_breaches_total",
  help: "Total breșe SLA task-uri HITL per tip și prioritate în E5",
  labelNames: ["task_type", "priority"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// HISTOGRAM: e5_etapa5_llm_latency_seconds (latență apeluri LLM în E5)
// Distribuția latențelor apelurilor LLM per model — alertă la > 30s
// ---------------------------------------------------------------------------

export const etapa5LlmLatencySeconds = new Histogram({
  name: "cerniq_e5_etapa5_llm_latency_seconds",
  help: "Distribuția latențelor apelurilor LLM per model în E5 — alertă SLA la 30s",
  labelNames: ["model"] as const,
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// HISTOGRAM: e5_etapa5_graph_build_seconds (durata build graph D20-D24)
// Durata totală build + algoritmi graph per algoritm — timeout D21 = 600s
// ---------------------------------------------------------------------------

export const etapa5GraphBuildSeconds = new Histogram({
  name: "cerniq_e5_etapa5_graph_build_seconds",
  help: "Durata build graph + algoritmi (D20-D24) per algoritm — bucket maxim = 600s (D21 timeout)",
  labelNames: ["algorithm"] as const,
  buckets: [10, 30, 60, 120, 300, 600],
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// HISTOGRAM: e5_etapa5_hitl_resolution_seconds (timp rezolvare HITL)
// Distribuția timpilor de rezolvare task-uri HITL per tip — SLA maxim 8h (28800s)
// ---------------------------------------------------------------------------

export const etapa5HitlResolutionSeconds = new Histogram({
  name: "cerniq_e5_etapa5_hitl_resolution_seconds",
  help: "Distribuția timpilor de rezolvare task-uri HITL per tip în E5 — SLA maxim 8h (28800s)",
  labelNames: ["task_type"] as const,
  buckets: [300, 900, 3600, 7200, 14400, 28800],
  registers: [metricsRegistry],
});
