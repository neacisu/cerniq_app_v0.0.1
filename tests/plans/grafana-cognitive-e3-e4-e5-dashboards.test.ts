/**
 * FAZA 12 — Dashboard-uri Grafana E3/E4/E5: JSON valid, refresh 30s, __inputs, metrici aliniate codului.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const DASHBOARDS = [
  {
    rel: "infra/config/grafana/dashboards/cerniq/cognitive-e3-ai-sales.json",
    uid: "cerniq-e3-cognitive-ai-sales",
    title: "Cerniq E3 — Cognitive AI Sales",
    metricSnippets: [
      "cerniq_ai_tokens_input",
      "cerniq_ai_llm_latency_seconds_bucket",
      "cerniq_negotiation_active",
      "cerniq_fiscal_invoices_total",
      "cerniq_llm_requests_total",
      "cerniq_llm_cost_usd_total",
      "cerniq_semantic_entropy_score_bucket",
      "cerniq_hallucination_flagged_total",
    ],
  },
  {
    rel: "infra/config/grafana/dashboards/cerniq/cognitive-e4-postsale.json",
    uid: "cerniq-e4-postsale",
    title: "CerniqAPP — E4 Post-Sale (FAZA 8i)",
    metricSnippets: [
      "cerniq_etapa4_orders_created_total",
      "cerniq_etapa4_payments_reconciliation_duration_seconds_bucket",
      "cerniq_etapa4_credit_score_distribution",
      "cerniq_etapa4_hitl_tasks_pending",
      "cerniq_etapa4_shipments_created_total",
    ],
  },
  {
    rel: "infra/config/grafana/dashboards/cerniq/cognitive-e5-nurturing.json",
    uid: "cognitive-e5-nurturing",
    title: "E5 Nurturing — Lifecycle & Community",
    metricSnippets: [
      "cerniq_e5_nurturing_clients_by_state",
      "cerniq_e5_nps_score_recorded_total",
      "cerniq_e5_etapa5_llm_latency_seconds_bucket",
      "cerniq_e5_etapa5_graph_build_seconds_bucket",
      "cerniq_e5_communities_detected_total",
    ],
  },
] as const;

describe("Grafana dashboards E3 / E4 / E5 (FAZA 12)", () => {
  for (const d of DASHBOARDS) {
    describe(d.rel, () => {
      const raw = readFileSync(path.join(ROOT, d.rel), "utf-8");
      const json = JSON.parse(raw) as Record<string, unknown>;

      it("JSON valid și metadate așteptate", () => {
        expect(json.uid).toBe(d.uid);
        expect(json.title).toBe(d.title);
        expect(json.refresh).toBe("30s");
        expect(json.schemaVersion).toBe(39);
      });

      it("__inputs declară DS_PROMETHEUS (import provisioning)", () => {
        const inputs = json.__inputs as Array<{ name: string; type: string; pluginId?: string }>;
        expect(Array.isArray(inputs)).toBe(true);
        expect(inputs.some((i) => i.name === "DS_PROMETHEUS" && i.pluginId === "prometheus")).toBe(
          true,
        );
      });

      it("panourile referă metrici din workers (snippets)", () => {
        const blob = raw;
        for (const m of d.metricSnippets) {
          expect(blob).toContain(m);
        }
      });

      it("templating include tenant_id (multi-tenant)", () => {
        const templating = json.templating as { list: Array<{ name: string }> };
        expect(templating?.list?.some((v) => v.name === "tenant_id")).toBe(true);
      });
    });
  }
});

describe("Grafana dashboard LLM / vLLM (FAZA 23)", () => {
  const rel = "infra/config/grafana/dashboards/cerniq/05-cerniq-llm-metrics.json";
  const raw = readFileSync(path.join(ROOT, rel), "utf-8");
  const json = JSON.parse(raw) as Record<string, unknown>;

  it("JSON valid: uid, refresh, variabile Prometheus", () => {
    expect(json.uid).toBe("cerniq-llm-metrics");
    expect(json.title).toBe("CerniqAPP LLM Metrics");
    expect(json.refresh).toBe("30s");
    expect(json.schemaVersion).toBe(39);
    const templating = json.templating as { list: Array<{ name: string }> };
    expect(templating?.list?.some((v) => v.name === "DS_PROMETHEUS")).toBe(true);
    expect(templating?.list?.some((v) => v.name === "instance")).toBe(true);
  });

  it("panouri: vLLM + metrici aplicație workers", () => {
    for (const m of [
      "vllm:gpu_cache_usage_perc",
      "cerniq_llm_cost_usd_total",
      "cerniq_llm_requests_total",
      "cerniq_llm_fallback_total",
      "cerniq_semantic_entropy_score_bucket",
      "cerniq_hallucination_flagged_total",
    ]) {
      expect(raw).toContain(m);
    }
  });
});
