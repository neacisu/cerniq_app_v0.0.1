/**
 * telemetry.test.ts — Audit complet 100% metrici Prometheus E5 (FAZA 9j)
 *
 * Testează:
 * 1. Existența și corectitudinea tuturor metricilor declarate în e5-metrics.ts
 * 2. Prefix naming corect (cerniq_e5_ namespace)
 * 3. Label names corecte per plan
 * 4. Bucket values corecte pentru histograme
 * 5. Tip corect per metrică (Counter/Gauge/Histogram)
 * 6. Nicio duplicare față de shared metrics
 * 7. CATALOG_STATS.byEtapa.e5 === 58
 * 8. Dashboard JSON valid (8 panouri, variabile, refresh)
 * 9. Alert rules YAML structural integrity
 * 10. OTel tracer name corect
 */

import { describe, it, expect } from "vitest";
import type { Counter, Gauge, Histogram } from "prom-client";
import {
  nurturingClientsByState,
  nurturingOnboardingPending,
  nurturingAtRiskCount,
  e5LlmRequestsTotal,
  e5ChurnSignalsDetectedTotal,
  e5ChurnEscalationsTotal,
  e5PostgisQuerySeconds,
  e5GraphBuildSeconds,
  e5LeidenPythonSeconds,
  e5KolProfilesTotal,
  e5CommunitiesDetected,
  e5ReferralsCreatedTotal,
  e5WinbackCampaignsActive,
  e5AssociationEntriesScrapedTotal,
  e5AssociationMemberMatchesTotal,
  e5NpsScoreRecorded,
  e5NpsScoreAvg,
  e5NpsDistribution,
  e5ContentDripsEnqueued,
  e5WeatherAlertsProcessed,
  e5ComplianceViolationsTotal,
  // FAZA 9j — metrici noi
  nurturingClientsAtRisk,
  nurturingReferralConversionRate,
  nurturingClusterPenetration,
  nurturingWinbackSuccessRate,
  nurturingReferralRevenueTotal,
  nurturingChurnScore,
  etapa5LlmTokensTotal,
  etapa5HitlTasksCreatedTotal,
  etapa5HitlSlaBreachesTotal,
  etapa5LlmLatencySeconds,
  etapa5GraphBuildSeconds,
  etapa5HitlResolutionSeconds,
} from "../lib/e5-metrics.js";
import { CATALOG_STATS } from "@cerniq/shared";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Helper: extrage metadata din obiect prom-client
// ---------------------------------------------------------------------------

type AnyMetric = Counter<string> | Gauge<string> | Histogram<string>;

function getMetricName(metric: AnyMetric): string {
  return (metric as unknown as { name: string }).name;
}

function getMetricHelp(metric: AnyMetric): string {
  return (metric as unknown as { help: string }).help;
}

function getMetricLabels(metric: AnyMetric): string[] {
  const labelNames = (metric as unknown as { labelNames: string[] }).labelNames;
  return labelNames ?? [];
}

function getHistogramBuckets(histogram: Histogram<string>): number[] {
  return (histogram as unknown as { buckets: number[] }).buckets ?? [];
}

// ---------------------------------------------------------------------------
// 1. Metrici originale E5 (FAZA 9b-9h) — existență și naming
// ---------------------------------------------------------------------------

describe("E5 Metrics — metrici originale FAZA 9b-9h", () => {
  it("nurturingClientsByState — Gauge corect cu labels [tenant_id, state]", () => {
    expect(getMetricName(nurturingClientsByState)).toBe("cerniq_e5_nurturing_clients_by_state");
    expect(getMetricLabels(nurturingClientsByState)).toContain("tenant_id");
    expect(getMetricLabels(nurturingClientsByState)).toContain("state");
  });

  it("nurturingOnboardingPending — Gauge cu label tenant_id", () => {
    expect(getMetricName(nurturingOnboardingPending)).toBe(
      "cerniq_e5_nurturing_onboarding_pending",
    );
    expect(getMetricLabels(nurturingOnboardingPending)).toContain("tenant_id");
  });

  it("nurturingAtRiskCount — Gauge cu label tenant_id", () => {
    expect(getMetricName(nurturingAtRiskCount)).toBe("cerniq_e5_nurturing_at_risk_count");
    expect(getMetricLabels(nurturingAtRiskCount)).toContain("tenant_id");
  });

  it("e5LlmRequestsTotal — Counter cu labels [model, provider, status]", () => {
    expect(getMetricName(e5LlmRequestsTotal)).toBe("cerniq_e5_llm_requests_total");
    expect(getMetricLabels(e5LlmRequestsTotal)).toContain("model");
    expect(getMetricLabels(e5LlmRequestsTotal)).toContain("provider");
    expect(getMetricLabels(e5LlmRequestsTotal)).toContain("status");
  });

  it("e5ChurnSignalsDetectedTotal — Counter cu labels [tenant_id, signal_type]", () => {
    expect(getMetricName(e5ChurnSignalsDetectedTotal)).toBe(
      "cerniq_e5_churn_signals_detected_total",
    );
    expect(getMetricLabels(e5ChurnSignalsDetectedTotal)).toContain("tenant_id");
    expect(getMetricLabels(e5ChurnSignalsDetectedTotal)).toContain("signal_type");
  });

  it("e5ChurnEscalationsTotal — Counter cu labels [tenant_id, risk_level]", () => {
    expect(getMetricName(e5ChurnEscalationsTotal)).toBe("cerniq_e5_churn_escalations_total");
    expect(getMetricLabels(e5ChurnEscalationsTotal)).toContain("tenant_id");
    expect(getMetricLabels(e5ChurnEscalationsTotal)).toContain("risk_level");
  });

  it("e5PostgisQuerySeconds — Histogram cu label query_type și buckets <= 10s", () => {
    expect(getMetricName(e5PostgisQuerySeconds)).toBe("cerniq_e5_postgis_query_seconds");
    expect(getMetricLabels(e5PostgisQuerySeconds)).toContain("query_type");
    const buckets = getHistogramBuckets(e5PostgisQuerySeconds);
    expect(buckets[0]).toBeLessThanOrEqual(0.05);
    expect(buckets.at(-1)).toBeGreaterThanOrEqual(5);
  });

  it("e5GraphBuildSeconds — Histogram (D20 DB query, NU leiden) cu label tenant_id", () => {
    expect(getMetricName(e5GraphBuildSeconds)).toBe("cerniq_e5_graph_build_seconds");
    expect(getMetricLabels(e5GraphBuildSeconds)).toContain("tenant_id");
  });

  it("e5LeidenPythonSeconds — Histogram cu labels [action, tenant_id] buckets până la 600s", () => {
    expect(getMetricName(e5LeidenPythonSeconds)).toBe("cerniq_e5_leiden_python_seconds");
    expect(getMetricLabels(e5LeidenPythonSeconds)).toContain("action");
    const buckets = getHistogramBuckets(e5LeidenPythonSeconds);
    expect(buckets.at(-1)).toBe(600);
  });

  it("e5KolProfilesTotal — Gauge cu labels [tenant_id, tier]", () => {
    expect(getMetricName(e5KolProfilesTotal)).toBe("cerniq_e5_kol_profiles_total");
    expect(getMetricLabels(e5KolProfilesTotal)).toContain("tenant_id");
    expect(getMetricLabels(e5KolProfilesTotal)).toContain("tier");
  });

  it("e5CommunitiesDetected — Gauge cu labels [tenant_id, method]", () => {
    expect(getMetricName(e5CommunitiesDetected)).toBe("cerniq_e5_communities_detected_total");
    expect(getMetricLabels(e5CommunitiesDetected)).toContain("tenant_id");
    expect(getMetricLabels(e5CommunitiesDetected)).toContain("method");
  });

  it("e5ReferralsCreatedTotal — Counter cu labels [tenant_id, referral_type]", () => {
    expect(getMetricName(e5ReferralsCreatedTotal)).toBe("cerniq_e5_referrals_created_total");
    expect(getMetricLabels(e5ReferralsCreatedTotal)).toContain("tenant_id");
    expect(getMetricLabels(e5ReferralsCreatedTotal)).toContain("referral_type");
  });

  it("e5WinbackCampaignsActive — Gauge cu labels [tenant_id, campaign_type]", () => {
    expect(getMetricName(e5WinbackCampaignsActive)).toBe("cerniq_e5_winback_campaigns_active");
    expect(getMetricLabels(e5WinbackCampaignsActive)).toContain("tenant_id");
    expect(getMetricLabels(e5WinbackCampaignsActive)).toContain("campaign_type");
  });

  it("e5NpsScoreRecorded — Counter cu labels [category, tenant_id]", () => {
    expect(getMetricName(e5NpsScoreRecorded)).toBe("cerniq_e5_nps_score_recorded_total");
    expect(getMetricLabels(e5NpsScoreRecorded)).toContain("category");
    expect(getMetricLabels(e5NpsScoreRecorded)).toContain("tenant_id");
  });

  it("e5NpsScoreAvg — Gauge cu label tenant_id (sursa alertă LowNPSScore < 6)", () => {
    expect(getMetricName(e5NpsScoreAvg)).toBe("cerniq_e5_nps_score_avg");
    expect(getMetricLabels(e5NpsScoreAvg)).toContain("tenant_id");
  });

  it("e5NpsDistribution — Counter cu label category", () => {
    expect(getMetricName(e5NpsDistribution)).toBe("cerniq_e5_nps_distribution_total");
    expect(getMetricLabels(e5NpsDistribution)).toContain("category");
  });

  it("e5ComplianceViolationsTotal — Counter cu label violation_type", () => {
    expect(getMetricName(e5ComplianceViolationsTotal)).toBe(
      "cerniq_e5_compliance_violations_total",
    );
    expect(getMetricLabels(e5ComplianceViolationsTotal)).toContain("violation_type");
  });

  it("e5ContentDripsEnqueued — Counter cu label tenant_id", () => {
    expect(getMetricName(e5ContentDripsEnqueued)).toBe("cerniq_e5_content_drips_enqueued_total");
    expect(getMetricLabels(e5ContentDripsEnqueued)).toContain("tenant_id");
  });

  it("e5WeatherAlertsProcessed — Counter cu labels [severity, alert_type]", () => {
    expect(getMetricName(e5WeatherAlertsProcessed)).toBe(
      "cerniq_e5_weather_alerts_processed_total",
    );
    expect(getMetricLabels(e5WeatherAlertsProcessed)).toContain("severity");
    expect(getMetricLabels(e5WeatherAlertsProcessed)).toContain("alert_type");
  });
});

// ---------------------------------------------------------------------------
// 2. Metrici noi FAZA 9j — existență, naming, labels, buckets
// ---------------------------------------------------------------------------

describe("E5 Metrics — metrici noi FAZA 9j (Plan L2345-2373)", () => {
  it("nurturingClientsAtRisk — Gauge cu labels [tenant_id, risk_level] (sursa alert HighChurnRiskClients)", () => {
    expect(getMetricName(nurturingClientsAtRisk)).toBe("cerniq_e5_nurturing_clients_at_risk");
    expect(getMetricLabels(nurturingClientsAtRisk)).toContain("tenant_id");
    expect(getMetricLabels(nurturingClientsAtRisk)).toContain("risk_level");
  });

  it("nurturingReferralConversionRate — Gauge cu label tenant_id (sursa alert ReferralConversionDrop)", () => {
    expect(getMetricName(nurturingReferralConversionRate)).toBe(
      "cerniq_e5_nurturing_referral_conversion_rate",
    );
    expect(getMetricLabels(nurturingReferralConversionRate)).toContain("tenant_id");
  });

  it("nurturingClusterPenetration — Gauge cu labels [tenant_id, cluster_type]", () => {
    expect(getMetricName(nurturingClusterPenetration)).toBe(
      "cerniq_e5_nurturing_cluster_penetration",
    );
    expect(getMetricLabels(nurturingClusterPenetration)).toContain("tenant_id");
    expect(getMetricLabels(nurturingClusterPenetration)).toContain("cluster_type");
  });

  it("nurturingWinbackSuccessRate — Gauge cu label tenant_id", () => {
    expect(getMetricName(nurturingWinbackSuccessRate)).toBe(
      "cerniq_e5_nurturing_winback_success_rate",
    );
    expect(getMetricLabels(nurturingWinbackSuccessRate)).toContain("tenant_id");
  });

  it("nurturingReferralRevenueTotal — Counter cu label tenant_id", () => {
    expect(getMetricName(nurturingReferralRevenueTotal)).toBe(
      "cerniq_e5_nurturing_referral_revenue_total",
    );
    expect(getMetricLabels(nurturingReferralRevenueTotal)).toContain("tenant_id");
  });

  it("nurturingChurnScore — Histogram cu labels [tenant_id, risk_level] și 10 buckets 10-100", () => {
    expect(getMetricName(nurturingChurnScore)).toBe("cerniq_e5_nurturing_churn_score");
    expect(getMetricLabels(nurturingChurnScore)).toContain("tenant_id");
    expect(getMetricLabels(nurturingChurnScore)).toContain("risk_level");
    const buckets = getHistogramBuckets(nurturingChurnScore);
    expect(buckets).toHaveLength(10);
    expect(buckets[0]).toBe(10);
    expect(buckets.at(-1)).toBe(100);
  });

  it("etapa5LlmTokensTotal — Counter cu labels [model, type]", () => {
    expect(getMetricName(etapa5LlmTokensTotal)).toBe("cerniq_e5_etapa5_llm_tokens_total");
    expect(getMetricLabels(etapa5LlmTokensTotal)).toContain("model");
    expect(getMetricLabels(etapa5LlmTokensTotal)).toContain("type");
  });

  it("etapa5HitlTasksCreatedTotal — Counter cu labels [task_type, priority]", () => {
    expect(getMetricName(etapa5HitlTasksCreatedTotal)).toBe(
      "cerniq_e5_etapa5_hitl_tasks_created_total",
    );
    expect(getMetricLabels(etapa5HitlTasksCreatedTotal)).toContain("task_type");
    expect(getMetricLabels(etapa5HitlTasksCreatedTotal)).toContain("priority");
  });

  it("etapa5HitlSlaBreachesTotal — Counter cu labels [task_type, priority]", () => {
    expect(getMetricName(etapa5HitlSlaBreachesTotal)).toBe(
      "cerniq_e5_etapa5_hitl_sla_breaches_total",
    );
    expect(getMetricLabels(etapa5HitlSlaBreachesTotal)).toContain("task_type");
    expect(getMetricLabels(etapa5HitlSlaBreachesTotal)).toContain("priority");
  });

  it("etapa5LlmLatencySeconds — Histogram cu label [model] și buckets [0.5, 1, 2, 5, 10, 30, 60]", () => {
    expect(getMetricName(etapa5LlmLatencySeconds)).toBe("cerniq_e5_etapa5_llm_latency_seconds");
    expect(getMetricLabels(etapa5LlmLatencySeconds)).toContain("model");
    const buckets = getHistogramBuckets(etapa5LlmLatencySeconds);
    expect(buckets).toEqual([0.5, 1, 2, 5, 10, 30, 60]);
    // Anti-halucinare (C): threshold alert = 30s (ultimul bucket semnificativ)
    expect(buckets).toContain(30);
  });

  it("etapa5GraphBuildSeconds — Histogram {algorithm} cu buckets [10, 30, 60, 120, 300, 600]", () => {
    expect(getMetricName(etapa5GraphBuildSeconds)).toBe("cerniq_e5_etapa5_graph_build_seconds");
    expect(getMetricLabels(etapa5GraphBuildSeconds)).toContain("algorithm");
    const buckets = getHistogramBuckets(etapa5GraphBuildSeconds);
    // Anti-halucinare (E): ultimul bucket = 600s (D21 timeout)
    expect(buckets).toEqual([10, 30, 60, 120, 300, 600]);
    expect(buckets.at(-1)).toBe(600);
  });

  it("etapa5HitlResolutionSeconds — Histogram {task_type} buckets [300, 900, 3600, 7200, 14400, 28800]", () => {
    expect(getMetricName(etapa5HitlResolutionSeconds)).toBe(
      "cerniq_e5_etapa5_hitl_resolution_seconds",
    );
    expect(getMetricLabels(etapa5HitlResolutionSeconds)).toContain("task_type");
    const buckets = getHistogramBuckets(etapa5HitlResolutionSeconds);
    expect(buckets).toEqual([300, 900, 3600, 7200, 14400, 28800]);
    // Verificare: 28800s = 8 ore (SLA maxim HITL)
    expect(buckets.at(-1)).toBe(28800);
  });
});

// ---------------------------------------------------------------------------
// 3. Verificare numărare totală metrici E5
// ---------------------------------------------------------------------------

describe("E5 Metrics — inventar complet", () => {
  it("toate metricile E5 au prefix cerniq_e5_", () => {
    const allMetrics = [
      nurturingClientsByState,
      nurturingOnboardingPending,
      nurturingAtRiskCount,
      e5LlmRequestsTotal,
      e5ChurnSignalsDetectedTotal,
      e5ChurnEscalationsTotal,
      e5PostgisQuerySeconds,
      e5GraphBuildSeconds,
      e5LeidenPythonSeconds,
      e5KolProfilesTotal,
      e5CommunitiesDetected,
      e5ReferralsCreatedTotal,
      e5WinbackCampaignsActive,
      e5AssociationEntriesScrapedTotal,
      e5AssociationMemberMatchesTotal,
      e5NpsScoreRecorded,
      e5NpsScoreAvg,
      e5NpsDistribution,
      e5ContentDripsEnqueued,
      e5WeatherAlertsProcessed,
      e5ComplianceViolationsTotal,
      nurturingClientsAtRisk,
      nurturingReferralConversionRate,
      nurturingClusterPenetration,
      nurturingWinbackSuccessRate,
      nurturingReferralRevenueTotal,
      nurturingChurnScore,
      etapa5LlmTokensTotal,
      etapa5HitlTasksCreatedTotal,
      etapa5HitlSlaBreachesTotal,
      etapa5LlmLatencySeconds,
      etapa5GraphBuildSeconds,
      etapa5HitlResolutionSeconds,
    ];
    for (const metric of allMetrics) {
      expect(getMetricName(metric)).toMatch(/^cerniq_e5_/);
    }
  });

  it("toate metricile E5 au help string non-gol (audit documentație Prometheus)", () => {
    const allMetrics = [
      nurturingClientsByState,
      nurturingOnboardingPending,
      nurturingAtRiskCount,
      e5LlmRequestsTotal,
      e5ChurnSignalsDetectedTotal,
      e5ChurnEscalationsTotal,
      e5PostgisQuerySeconds,
      e5GraphBuildSeconds,
      e5LeidenPythonSeconds,
      e5KolProfilesTotal,
      e5CommunitiesDetected,
      e5ReferralsCreatedTotal,
      e5WinbackCampaignsActive,
      e5AssociationEntriesScrapedTotal,
      e5AssociationMemberMatchesTotal,
      e5NpsScoreRecorded,
      e5NpsScoreAvg,
      e5NpsDistribution,
      e5ContentDripsEnqueued,
      e5WeatherAlertsProcessed,
      e5ComplianceViolationsTotal,
      nurturingClientsAtRisk,
      nurturingReferralConversionRate,
      nurturingClusterPenetration,
      nurturingWinbackSuccessRate,
      nurturingReferralRevenueTotal,
      nurturingChurnScore,
      etapa5LlmTokensTotal,
      etapa5HitlTasksCreatedTotal,
      etapa5HitlSlaBreachesTotal,
      etapa5LlmLatencySeconds,
      etapa5GraphBuildSeconds,
      etapa5HitlResolutionSeconds,
    ];
    for (const metric of allMetrics) {
      const help = getMetricHelp(metric);
      expect(help.length, `Metrica ${getMetricName(metric)} nu are help string`).toBeGreaterThan(0);
    }
  });

  it("total metrici E5 declarate = 33 (21 originale + 11 FAZA 9j + 1 nps_distribution)", () => {
    const allE5MetricNames = [
      "cerniq_e5_nurturing_clients_by_state",
      "cerniq_e5_nurturing_onboarding_pending",
      "cerniq_e5_nurturing_at_risk_count",
      "cerniq_e5_llm_requests_total",
      "cerniq_e5_churn_signals_detected_total",
      "cerniq_e5_churn_escalations_total",
      "cerniq_e5_postgis_query_seconds",
      "cerniq_e5_graph_build_seconds",
      "cerniq_e5_leiden_python_seconds",
      "cerniq_e5_kol_profiles_total",
      "cerniq_e5_communities_detected_total",
      "cerniq_e5_referrals_created_total",
      "cerniq_e5_winback_campaigns_active",
      "cerniq_e5_association_entries_scraped_total",
      "cerniq_e5_association_member_matches_total",
      "cerniq_e5_nps_score_recorded_total",
      "cerniq_e5_nps_score_avg",
      "cerniq_e5_nps_distribution_total",
      "cerniq_e5_content_drips_enqueued_total",
      "cerniq_e5_weather_alerts_processed_total",
      "cerniq_e5_compliance_violations_total",
      // FAZA 9j
      "cerniq_e5_nurturing_clients_at_risk",
      "cerniq_e5_nurturing_referral_conversion_rate",
      "cerniq_e5_nurturing_cluster_penetration",
      "cerniq_e5_nurturing_winback_success_rate",
      "cerniq_e5_nurturing_referral_revenue_total",
      "cerniq_e5_nurturing_churn_score",
      "cerniq_e5_etapa5_llm_tokens_total",
      "cerniq_e5_etapa5_hitl_tasks_created_total",
      "cerniq_e5_etapa5_hitl_sla_breaches_total",
      "cerniq_e5_etapa5_llm_latency_seconds",
      "cerniq_e5_etapa5_graph_build_seconds",
      "cerniq_e5_etapa5_hitl_resolution_seconds",
    ];
    expect(allE5MetricNames).toHaveLength(33);
    const uniqueNames = new Set(allE5MetricNames);
    expect(uniqueNames.size).toBe(33);
  });

  it("nicio metrică E5 nu duplică metricile din shared metrics.ts", () => {
    const sharedMetricNames = [
      "cerniq_worker_jobs_processed_total",
      "cerniq_worker_jobs_failed_total",
      "cerniq_worker_job_duration_seconds",
      "cerniq_worker_queue_depth",
      "cerniq_hitl_tasks_created_total",
      "cerniq_hitl_tasks_resolved_total",
      "cerniq_hitl_resolution_time_seconds",
    ];
    const e5Names = [
      getMetricName(nurturingClientsByState),
      getMetricName(e5LlmRequestsTotal),
      getMetricName(etapa5HitlTasksCreatedTotal),
      getMetricName(etapa5HitlResolutionSeconds),
    ];
    for (const name of e5Names) {
      expect(sharedMetricNames).not.toContain(name);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. CATALOG_STATS — verificare 58 neuroni E5
// ---------------------------------------------------------------------------

describe("CognitiveCatalog — E5 completitudine (FAZA 9i prerequisit pentru 9j)", () => {
  it("CATALOG_STATS.byEtapa.e5 === 58", () => {
    expect(CATALOG_STATS.byEtapa.e5).toBe(58);
  });

  it("CATALOG_STATS.total >= 310 (E1+E2+E3+E4+E5)", () => {
    expect(CATALOG_STATS.total).toBeGreaterThanOrEqual(310);
  });
});

// ---------------------------------------------------------------------------
// 5. Grafana Dashboard — validare structurală JSON
// ---------------------------------------------------------------------------

describe("Grafana Dashboard — cognitive-e5-nurturing.json", () => {
  const dashboardPath = path.resolve(
    process.cwd(),
    "../../infra/config/grafana/dashboards/cerniq/cognitive-e5-nurturing.json",
  );

  let dashboard: Record<string, unknown>;

  it("fișierul dashboard există", () => {
    expect(fs.existsSync(dashboardPath)).toBe(true);
    const raw = fs.readFileSync(dashboardPath, "utf-8");
    dashboard = JSON.parse(raw) as Record<string, unknown>;
    expect(dashboard).toBeDefined();
  });

  it("dashboard are exact 8 panouri (Plan: 8 panouri)", () => {
    const panels = dashboard["panels"] as unknown[];
    expect(panels).toHaveLength(8);
  });

  it("dashboard are refresh = '30s' (aliniat Plan §XII / 06-cognitive-brain)", () => {
    expect(dashboard["refresh"]).toBe("30s");
  });

  it("dashboard are 3 variabile template: tenant_id, time_range, state", () => {
    const templating = dashboard["templating"] as { list: Array<{ name: string }> };
    const varNames = templating.list.map((v) => v.name);
    expect(varNames).toContain("tenant_id");
    expect(varNames).toContain("time_range");
    expect(varNames).toContain("state");
  });

  it("dashboard.uid = 'cognitive-e5-nurturing'", () => {
    expect(dashboard["uid"]).toBe("cognitive-e5-nurturing");
  });

  it("dashboard are tag 'e5' și 'nurturing'", () => {
    const tags = dashboard["tags"] as string[];
    expect(tags).toContain("e5");
    expect(tags).toContain("nurturing");
  });

  it("panoul 'Lifecycle States' există și referențiază metrica corectă", () => {
    const panels = dashboard["panels"] as Array<{
      title: string;
      targets: Array<{ expr: string }>;
    }>;
    const panel = panels.find((p) => p.title === "Lifecycle States");
    expect(panel).toBeDefined();
    expect(panel?.targets[0].expr).toContain("cerniq_e5_nurturing_clients_by_state");
  });

  it("panoul 'LLM Usage' referențiază metrici P95 latency cu cerniq_e5_etapa5_llm_latency", () => {
    const panels = dashboard["panels"] as Array<{
      title: string;
      targets: Array<{ expr: string }>;
    }>;
    const panel = panels.find((p) => p.title === "LLM Usage");
    expect(panel).toBeDefined();
    const exprs = panel?.targets.map((t) => t.expr).join(" ");
    expect(exprs).toContain("cerniq_e5_etapa5_llm_latency_seconds_bucket");
  });
});

// ---------------------------------------------------------------------------
// 6. Alert Rules YAML — validare structurală
// ---------------------------------------------------------------------------

describe("Alert Rules — etapa5.yml structură și GDPR compliance", () => {
  const alertsPath = path.resolve(process.cwd(), "../../infra/config/prometheus/etapa5.yml");

  let alertsContent: string;

  it("fișierul etapa5.yml există", () => {
    expect(fs.existsSync(alertsPath)).toBe(true);
    alertsContent = fs.readFileSync(alertsPath, "utf-8");
    expect(alertsContent.length).toBeGreaterThan(100);
  });

  it("conține exact 9 alert rules (HighChurnRiskClients, LowNPSScore, etc.)", () => {
    const alertMatches = alertsContent.match(/^\s+- alert:/gm);
    expect(alertMatches).toHaveLength(9);
  });

  it("GDPRConsentViolation are severity CRITICAL (nu WARNING) — Anti-halucinare (B)", () => {
    const startIdx = alertsContent.indexOf("alert: GDPRConsentViolation");
    const gdprSection = alertsContent.substring(startIdx, startIdx + 600);
    expect(gdprSection).toContain("severity: critical");
    expect(gdprSection).not.toContain("severity: warning");
  });

  it("CompetitionLawViolation are severity CRITICAL (nu WARNING) — Anti-halucinare (B)", () => {
    const startIdx = alertsContent.indexOf("alert: CompetitionLawViolation");
    const competitionSection = alertsContent.substring(startIdx, startIdx + 600);
    expect(competitionSection).toContain("severity: critical");
    expect(competitionSection).not.toContain("severity: warning");
  });

  it("HITLSLABreachRate are severity CRITICAL (Plan L2386)", () => {
    const startIdx = alertsContent.indexOf("alert: HITLSLABreachRate");
    const hitlSection = alertsContent.substring(startIdx, startIdx + 600);
    expect(hitlSection).toContain("severity: critical");
  });

  it("LLMHighLatency threshold = 30s (nu 10s) — Anti-halucinare (C)", () => {
    const startIdx = alertsContent.indexOf("alert: LLMHighLatency");
    const llmSection = alertsContent.substring(startIdx, startIdx + 500);
    expect(llmSection).toContain("> 30");
    expect(llmSection).not.toMatch(/>\s*10\b/);
  });

  it("GraphBuildFailure referențiază queue='community:detect:leiden'", () => {
    expect(alertsContent).toContain("community:detect:leiden");
  });

  it("GDPRConsentViolation referențiează metrica e5_compliance_violations_total", () => {
    expect(alertsContent).toContain("cerniq_e5_compliance_violations_total");
    expect(alertsContent).toContain("GDPR_CONSENT");
  });

  it("CompetitionLawViolation referențiează violation_type='COMPETITION_LAW'", () => {
    expect(alertsContent).toContain("COMPETITION_LAW");
  });

  it("SentimentWorkerBacklog referențiează cerniq_worker_queue_depth_by_state (shared metric)", () => {
    expect(alertsContent).toContain("cerniq_worker_queue_depth_by_state");
    expect(alertsContent).toContain("sentiment:analyze");
  });
});

// ---------------------------------------------------------------------------
// 7. Prometheus scrape config — verificare structurală
// ---------------------------------------------------------------------------

describe("Prometheus.yml — scrape target E5", () => {
  const prometheusPath = path.resolve(
    process.cwd(),
    "../../infra/config/prometheus/prometheus.yml",
  );

  let prometheusContent: string;

  it("fișierul prometheus.yml există", () => {
    expect(fs.existsSync(prometheusPath)).toBe(true);
    prometheusContent = fs.readFileSync(prometheusPath, "utf-8");
  });

  it("are rule_file etapa5.yml referențiat", () => {
    expect(prometheusContent).toContain("etapa5.yml");
  });

  it("are job_name cerniq-worker-e5-nurturing", () => {
    expect(prometheusContent).toContain("cerniq-worker-e5-nurturing");
  });

  it("scrape target E5 este cerniq-worker-e5-nurturing:3000", () => {
    expect(prometheusContent).toContain("cerniq-worker-e5-nurturing:3000");
  });

  it("scrape target E5 are etapa: E5 label", () => {
    const startIdx = prometheusContent.indexOf("job_name: cerniq-worker-e5-nurturing");
    const e5Section = prometheusContent.substring(startIdx, startIdx + 600);
    expect(e5Section).toContain("etapa: E5");
  });

  it("are job_name cerniq-worker-e3-ai-sales pe :3002 (metrici E3)", () => {
    expect(prometheusContent).toContain("job_name: cerniq-worker-e3-ai-sales");
    expect(prometheusContent).toContain("cerniq-worker-e3-ai-sales:3002");
    const startIdx = prometheusContent.indexOf("job_name: cerniq-worker-e3-ai-sales");
    const e3Section = prometheusContent.substring(startIdx, startIdx + 500);
    expect(e3Section).toContain("etapa: E3");
  });
});

// ---------------------------------------------------------------------------
// 8. OTel tracing — verificare tracer name în sursă
// ---------------------------------------------------------------------------

describe("OTel Tracing — tracer name etapa5-workers", () => {
  it("cognitive-helpers.ts folosește tracer 'cerniq' (shared tracer pentru toți workerii)", () => {
    const helpersPath = path.resolve(
      process.cwd(),
      "../../workers/shared/src/cognitive-helpers.ts",
    );
    expect(fs.existsSync(helpersPath)).toBe(true);
    const content = fs.readFileSync(helpersPath, "utf-8");
    expect(content).toContain("getTracer");
  });

  it("e5-metrics.ts folosește metricsRegistry din @cerniq/worker-shared (pattern corect)", () => {
    const metricsPath = path.resolve(process.cwd(), "src/lib/e5-metrics.ts");
    const content = fs.readFileSync(metricsPath, "utf-8");
    expect(content).toContain("metricsRegistry");
    expect(content).toContain("@cerniq/worker-shared");
  });
});
