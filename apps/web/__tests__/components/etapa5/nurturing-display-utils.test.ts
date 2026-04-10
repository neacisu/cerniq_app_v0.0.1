import { describe, it, expect, vi } from "vitest";
import { toast } from "sonner";
import {
  formatMoneyEur,
  nextContactLabel,
  handleNurturingTableMessage,
} from "@/components/etapa5/nurturing-display-utils.js";
import type { NurturingStateListRow } from "@/lib/etapa5-api.js";

function minimalRow(
  p: Partial<NurturingStateListRow> & Pick<NurturingStateListRow, "id" | "leadId" | "currentState">,
): NurturingStateListRow {
  return {
    id: p.id,
    tenantId: p.tenantId ?? "t",
    leadId: p.leadId,
    companyName: p.companyName ?? null,
    currentState: p.currentState,
    churnRiskScore: p.churnRiskScore ?? 0,
    churnRiskLevel: p.churnRiskLevel ?? "LOW",
    totalOrders: p.totalOrders ?? 0,
    totalRevenue: p.totalRevenue ?? "0",
    daysSinceLastOrder: p.daysSinceLastOrder ?? null,
    npsScore: p.npsScore ?? null,
    satisfactionTrend: p.satisfactionTrend ?? null,
    successfulReferrals: p.successfulReferrals ?? 0,
    neighborCount: p.neighborCount ?? 0,
    isAdvocate: p.isAdvocate ?? false,
    isKol: p.isKol ?? false,
    lastInteractionAt: p.lastInteractionAt ?? "2026-01-01T00:00:00.000Z",
    cui: p.cui ?? null,
    judet: p.judet ?? null,
  };
}

describe("nurturing-display-utils", () => {
  it("formatMoneyEur formatează K / M", () => {
    expect(formatMoneyEur("1500")).toMatch(/1\.5K/);
    expect(formatMoneyEur("2000000")).toMatch(/2\.00M/);
    expect(formatMoneyEur(undefined)).toBe("—");
  });

  it("nextContactLabel pentru AT_RISK / CHURNED", () => {
    expect(nextContactLabel(minimalRow({ id: "1", leadId: "l", currentState: "AT_RISK" }))).toBe(
      "Prioritar",
    );
    expect(nextContactLabel(minimalRow({ id: "2", leadId: "l", currentState: "CHURNED" }))).toBe(
      "—",
    );
  });

  it("handleNurturingTableMessage apelează toast.info", () => {
    const spy = vi.spyOn(toast, "info").mockImplementation(() => "id");
    handleNurturingTableMessage("Acme");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Acme"));
    spy.mockRestore();
  });
});
