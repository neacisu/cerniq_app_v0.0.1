import { describe, it, expect } from "vitest";
import {
  buildChurnJudetRiskHeatmap,
  churnCountIntensityColor,
  CHURN_HEATMAP_RISK_ORDER,
} from "@/lib/etapa5-churn-heatmap.js";
import type { ChurnFactorRow } from "@/lib/etapa5-api.js";

function row(
  partial: Partial<ChurnFactorRow> & Pick<ChurnFactorRow, "id" | "leadId" | "tenantId">,
): ChurnFactorRow {
  return {
    overallChurnScore: 50,
    riskLevel: "MEDIUM",
    factorBreakdown: {},
    activeSignalCount: 0,
    lastCalculatedAt: "2026-01-01T00:00:00.000Z",
    companyName: "X",
    cui: "1",
    judet: "AB",
    ...partial,
  };
}

describe("buildChurnJudetRiskHeatmap", () => {
  it("returns empty model when no rows", () => {
    const m = buildChurnJudetRiskHeatmap([]);
    expect(m.columnKeys).toEqual([]);
    expect(m.matrix).toEqual([]);
    expect(m.maxCell).toBe(0);
  });

  it("aggregates counts by judet and risk level", () => {
    const rows = [
      row({ id: "1", leadId: "l1", tenantId: "t", riskLevel: "HIGH", judet: "TM" }),
      row({ id: "2", leadId: "l2", tenantId: "t", riskLevel: "HIGH", judet: "TM" }),
      row({ id: "3", leadId: "l3", tenantId: "t", riskLevel: "LOW", judet: "IL" }),
    ];
    const m = buildChurnJudetRiskHeatmap(rows, 10);
    expect(m.rowKeys).toEqual(CHURN_HEATMAP_RISK_ORDER);
    expect(m.columnKeys).toContain("TM");
    expect(m.columnKeys).toContain("IL");
    const hi = m.rowKeys.indexOf("HIGH");
    const lo = m.rowKeys.indexOf("LOW");
    const cTM = m.columnKeys.indexOf("TM");
    const cIL = m.columnKeys.indexOf("IL");
    expect(m.matrix[hi]?.[cTM]).toBe(2);
    expect(m.matrix[lo]?.[cIL]).toBe(1);
    expect(m.maxCell).toBe(2);
  });

  it("maps unknown judet to Necunoscut", () => {
    const rows = [
      row({ id: "1", leadId: "l1", tenantId: "t", riskLevel: "CRITICAL", judet: null }),
    ];
    const m = buildChurnJudetRiskHeatmap(rows);
    expect(m.columnKeys).toContain("Necunoscut");
  });

  it("skips matrix aggregation for risk levels outside the ordered heatmap set", () => {
    const valid = row({ id: "1", leadId: "l1", tenantId: "t", riskLevel: "HIGH", judet: "TM" });
    const withOddRisk = {
      ...row({ id: "2", leadId: "l2", tenantId: "t", riskLevel: "LOW", judet: "TM" }),
      riskLevel: "UNKNOWN_TIER" as ChurnFactorRow["riskLevel"],
    };
    const m = buildChurnJudetRiskHeatmap([valid, withOddRisk], 10);
    const hi = m.rowKeys.indexOf("HIGH");
    const cTM = m.columnKeys.indexOf("TM");
    expect(m.matrix[hi]?.[cTM]).toBe(1);
  });
});

describe("churnCountIntensityColor", () => {
  it("returns baseline for zero max", () => {
    expect(churnCountIntensityColor(3, 0)).toContain("oklch");
  });
});
