import { describe, expect, it } from "vitest";
import {
  assignLeadSchema,
  assignTaskSchema,
  dedupDecisionSchema,
  decisionSchema,
  importConfigSchema,
  listApprovalTasksSchema,
  listBronzeContactsSchema,
  listGoldCompaniesSchema,
  listSilverCompaniesSchema,
  triggerEnrichmentSchema,
  triggerPromotionSchema,
  updateLeadStateSchema,
} from "../src/schemas/etapa1.js";

describe("etapa1 schemas", () => {
  it("accepta config valid de import", () => {
    const parsed = importConfigSchema.parse({
      hasHeader: true,
      encoding: "utf-8",
      delimiter: ",",
      sheetName: "Sheet1",
      mapping: { CUI: "cui", Name: "companyName" },
    });
    expect(parsed.hasHeader).toBe(true);
    expect(parsed.mapping?.CUI).toBe("cui");
  });

  it("respinge delimiter invalid", () => {
    const parsed = importConfigSchema.safeParse({
      encoding: "utf-8",
      delimiter: "|",
    });
    expect(parsed.success).toBe(false);
  });

  it("parseaza filtre bronze contacts", () => {
    const parsed = listBronzeContactsSchema.parse({
      limit: "50",
      offset: "0",
      sortBy: "updatedAt",
      sortDir: "asc",
      status: "processing",
    });
    expect(parsed.limit).toBe(50);
    expect(parsed.sortDir).toBe("asc");
  });

  it("parseaza approvals list cu statuses, overdue si sort", () => {
    const parsed = listApprovalTasksSchema.parse({
      statuses: "pending,assigned",
      overdue: "true",
      sortBy: "dueAt",
      sortDir: "desc",
    });
    expect(parsed.statuses).toEqual(["pending", "assigned"]);
    expect(parsed.overdue).toBe(true);
    expect(parsed.sortDir).toBe("desc");
  });

  it("validare assign/decision schemas", () => {
    expect(assignTaskSchema.safeParse({ userId: "not-uuid" }).success).toBe(false);
    expect(
      decisionSchema.safeParse({
        decision: "approve",
        reason: "Looks good",
        metadata: { source: "manual" },
      }).success,
    ).toBe(true);
  });

  it("parseaza filtre silver si gold", () => {
    const silver = listSilverCompaniesSchema.parse({
      search: "agro",
      minQuality: "40",
      maxQuality: "90",
      sortBy: "totalQualityScore",
      sortDir: "desc",
    });
    const gold = listGoldCompaniesSchema.parse({
      currentState: "COLD,NEGOTIATION",
      doNotContact: "false",
      isAgricultural: "true",
      sortBy: "leadScore",
      sortDir: "asc",
      limit: "25",
    });
    expect(silver.minQuality).toBe(40);
    expect(gold.currentState).toEqual(["COLD", "NEGOTIATION"]);
    expect(gold.isAgricultural).toBe(true);
    expect(gold.sortBy).toBe("leadScore");
    expect(gold.limit).toBe(25);
  });

  it("parseaza trigger schemas si lead update schemas", () => {
    const enrich = triggerEnrichmentSchema.parse({ force: true, sources: ["anaf", "termene"] });
    const promote = triggerPromotionSchema.parse({});
    const leadPatch = assignLeadSchema.merge(updateLeadStateSchema).parse({
      assignedTo: null,
      currentState: "ENGAGED",
      doNotContact: false,
    });
    const dedup = dedupDecisionSchema.parse({ decision: "merge", reason: "high confidence merge" });

    expect(enrich.force).toBe(true);
    expect(promote.force).toBe(false);
    expect(leadPatch.currentState).toBe("ENGAGED");
    expect(dedup.decision).toBe("merge");
  });
});
