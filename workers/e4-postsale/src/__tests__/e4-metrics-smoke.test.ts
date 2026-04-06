/**
 * Contract metrici locale E4 (e4-metrics.ts) + verificare re-exporturi din worker-shared.
 */
import { describe, it, expect } from "vitest";
import { metricsRegistry } from "@cerniq/worker-shared";
import {
  e4OrdersCreatedTotal,
  e4OrdersValueTotal,
  e4PaymentsReceivedTotal,
  e4ExternalApiCallsTotal,
  e4RevolutWebhooksTotal,
  e4ReconciliationTotal,
  e4ShipmentsCreatedTotal,
} from "../e4-metrics.js";

describe("e4-metrics — smoke", () => {
  it("metrici locale au prefix cerniq_etapa4_", () => {
    expect((e4OrdersCreatedTotal as unknown as { name: string }).name).toBe(
      "cerniq_etapa4_orders_created_total",
    );
    expect((e4OrdersValueTotal as unknown as { name: string }).name).toBe(
      "cerniq_etapa4_orders_value_total",
    );
    expect((e4PaymentsReceivedTotal as unknown as { name: string }).name).toBe(
      "cerniq_etapa4_payments_received_total",
    );
    expect((e4ExternalApiCallsTotal as unknown as { name: string }).name).toBe(
      "cerniq_etapa4_external_api_calls_total",
    );
  });

  it("metrici locale și re-exporturi sunt înregistrate în metricsRegistry", async () => {
    const json = await metricsRegistry.getMetricsAsJSON();
    const names = new Set(json.map((x) => x.name));
    for (const m of [
      e4OrdersCreatedTotal,
      e4OrdersValueTotal,
      e4PaymentsReceivedTotal,
      e4ExternalApiCallsTotal,
      e4RevolutWebhooksTotal,
      e4ReconciliationTotal,
      e4ShipmentsCreatedTotal,
    ]) {
      const name = (m as unknown as { name: string }).name;
      expect(names.has(name)).toBe(true);
    }
  });

  it("increment pe counter-uri locale fără eroare", () => {
    e4OrdersCreatedTotal.inc({ tenant_id: "t1", payment_method: "CARD", status: "OK" });
    e4OrdersValueTotal.inc({ tenant_id: "t1", currency: "RON" }, 100);
    e4PaymentsReceivedTotal.inc({
      tenant_id: "t1",
      source: "REVOLUT",
      reconciliation_status: "MATCHED",
    });
    e4ExternalApiCallsTotal.inc({ service: "revolut", endpoint: "/pay", status: "200" });
  });
});
