/**
 * Smoke + contract pentru metricile Prometheus E3 (e3-metrics.ts).
 * Verifică înregistrarea în metricsRegistry, nume, label-uri și operații de bază.
 */
import { describe, it, expect } from "vitest";
import { metricsRegistry } from "@cerniq/worker-shared";
import {
  aiTokensInput,
  aiTokensOutput,
  aiLlmLatencySeconds,
  aiGuardrailPassRate,
  aiRegenerationAttempts,
  negotiationActive,
  negotiationDiscountAvg,
  fiscalInvoicesTotal,
  einvoiceErrorsTotal,
  fiscalConversionRate,
  einvoiceDeadlineRiskCount,
  mcpToolCallsTotal,
  mcpSessionActive,
  stockReservationActive,
  llmRequestsTotal,
  llmFallbackTotal,
} from "../e3-metrics.js";

describe("e3-metrics — Prometheus contract", () => {
  it("toate metricile au nume cerniq_* și sunt înregistrate în metricsRegistry", async () => {
    const json = await metricsRegistry.getMetricsAsJSON();
    const metrics = [
      aiTokensInput,
      aiTokensOutput,
      aiLlmLatencySeconds,
      aiGuardrailPassRate,
      aiRegenerationAttempts,
      negotiationActive,
      negotiationDiscountAvg,
      fiscalInvoicesTotal,
      einvoiceErrorsTotal,
      fiscalConversionRate,
      einvoiceDeadlineRiskCount,
      mcpToolCallsTotal,
      mcpSessionActive,
      stockReservationActive,
      llmRequestsTotal,
      llmFallbackTotal,
    ];

    for (const m of metrics) {
      const name = (m as unknown as { name: string }).name;
      expect(name.startsWith("cerniq_")).toBe(true);
      expect(json.some((row) => row.name === name)).toBe(true);
    }
  });

  it("aiLlmLatencySeconds folosește bucket-ele planificate", () => {
    const buckets = (aiLlmLatencySeconds as unknown as { buckets: number[] }).buckets;
    expect(buckets).toEqual([0.1, 0.5, 1, 2, 5, 10, 30, 60, 120]);
  });

  it("aiRegenerationAttempts — bucket [1,2,3]", () => {
    const buckets = (aiRegenerationAttempts as unknown as { buckets: number[] }).buckets;
    expect(buckets).toEqual([1, 2, 3]);
  });

  it("Counter / Gauge / Histogram acceptă increment/observe/set fără eroare", () => {
    aiTokensInput.inc({ model: "gpt-test", tenant_id: "t1" });
    aiTokensOutput.inc({ model: "gpt-test", tenant_id: "t1" });
    const end = aiLlmLatencySeconds.startTimer({ model: "m", operation: "completion" });
    end();
    aiGuardrailPassRate.set({ tenant_id: "t1" }, 88);
    aiRegenerationAttempts.observe({ guardrail_type: "price" }, 2);
    negotiationActive.set({ tenant_id: "t1", state: "NEGOTIATION" }, 3);
    negotiationDiscountAvg.observe({ tenant_id: "t1" }, 12);
    fiscalInvoicesTotal.inc({ tenant_id: "t1", doc_type: "INVOICE" });
    einvoiceErrorsTotal.inc({ error_type: "SPV_REJECT", tenant_id: "t1" });
    fiscalConversionRate.set({ tenant_id: "t1" }, 0.42);
    einvoiceDeadlineRiskCount.set({ tenant_id: "t1" }, 2);
    mcpToolCallsTotal.inc({ tool_name: "search", status: "ok" });
    mcpSessionActive.set({ tenant_id: "t1" }, 1);
    stockReservationActive.set({ tenant_id: "t1" }, 5);
    llmRequestsTotal.inc({
      model_id: "x",
      task_type: "reasoning",
      status: "ok",
      is_selfhosted: "false",
    });
    llmFallbackTotal.inc({ frontier_model: "gpt-4o", reason: "timeout" });

    expect(metricsRegistry).toBeDefined();
  });
});
