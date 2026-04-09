/**
 * J1 — integrare cu mock `infraqStructuredJson` (fără apel rețea).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/infraq-structured-json.js", () => ({
  infraqStructuredJson: vi.fn(async () => ({
    denumire: "Test SRL",
    cui: "12345678",
    confidence: 0.95,
    cod_caen_principal: "0111",
    is_agricol: false,
  })),
}));

vi.mock("./pipeline-utils.js", () => ({
  createHitlApprovalTask: vi.fn(async () => undefined),
}));

vi.mock("@cerniq/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async () => undefined),
    })),
  },
  silverCompanies: { id: "id", metadata: "metadata", lastEnrichedAt: "lastEnrichedAt" },
  silverEnrichmentLog: {},
  sql: { raw: vi.fn((s: unknown) => s) },
  setSessionTenantId: vi.fn(async () => undefined),
}));

import { grokStructuringProcessor } from "./j1-grok-structuring.js";
import { infraqStructuredJson } from "../lib/infraq-structured-json.js";

describe("j1-grok-structuring processor (mock infraq)", () => {
  beforeEach(() => {
    vi.mocked(infraqStructuredJson).mockClear();
  });

  it("apelează infraqStructuredJson și întoarce structurare aplicată", async () => {
    const job = {
      id: "job-1",
      data: {
        tenantId: "00000000-0000-4000-8000-000000000001",
        companyId: "00000000-0000-4000-8000-000000000002",
        rawData: { name: "X" },
      },
    };
    const out = await grokStructuringProcessor(job as never, {} as never);
    expect(vi.mocked(infraqStructuredJson)).toHaveBeenCalled();
    expect(out).toMatchObject({ ok: true });
  });
});
