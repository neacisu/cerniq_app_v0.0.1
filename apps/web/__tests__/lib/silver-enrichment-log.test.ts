import { describe, it, expect } from "vitest";
import {
  enrichmentLogStatusBadgeVariant,
  isSilverEnrichmentLogKnownStatus,
  mapSilverEnrichmentLogApiRow,
} from "@/lib/silver-enrichment-log.js";

describe("silver-enrichment-log", () => {
  it("recunoaște statusuri cunoscute din workeri", () => {
    expect(isSilverEnrichmentLogKnownStatus("success")).toBe(true);
    expect(isSilverEnrichmentLogKnownStatus("failed")).toBe(true);
    expect(isSilverEnrichmentLogKnownStatus("skipped")).toBe(true);
    expect(isSilverEnrichmentLogKnownStatus("custom")).toBe(false);
  });

  it("mapează variantele Badge la valorile DB", () => {
    expect(enrichmentLogStatusBadgeVariant("success")).toBe("brand");
    expect(enrichmentLogStatusBadgeVariant("failed")).toBe("error");
    expect(enrichmentLogStatusBadgeVariant("skipped")).toBe("info");
    expect(enrichmentLogStatusBadgeVariant(null)).toBe("neutral");
    expect(enrichmentLogStatusBadgeVariant("unknown_custom")).toBe("neutral");
  });

  it("mapSilverEnrichmentLogApiRow folosește operation și câmpurile schema", () => {
    const row = mapSilverEnrichmentLogApiRow({
      id: "u1",
      createdAt: "2026-01-01T00:00:00.000Z",
      entityType: "company",
      entityId: "e1",
      source: "worker",
      operation: "c1_validate",
      status: "success",
      jobId: "job-1",
      errorMessage: null,
      responsePayload: { ok: true },
    });
    expect(row.operation).toBe("c1_validate");
    expect(row.status).toBe("success");
    expect(row.entityType).toBe("company");
    expect(row.details).toEqual({ ok: true });
  });

  it("status lipsă → unknown", () => {
    const row = mapSilverEnrichmentLogApiRow({
      id: "x",
      operation: "op",
    });
    expect(row.status).toBe("unknown");
  });
});
