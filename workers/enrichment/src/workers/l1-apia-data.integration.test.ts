/**
 * L1 — integrare cu fetch mock (fără APIA real).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  jobLogs: {},
  sql: { raw: vi.fn((s: unknown) => s) },
  setSessionTenantId: vi.fn(async () => undefined),
}));

import { apiaDataProcessor } from "./l1-apia-data.js";

describe("l1-apia-data processor (mock fetch)", () => {
  const prevTemplate = process.env.APIA_ENDPOINT_TEMPLATE;
  const prevTimeout = process.env.APIA_TIMEOUT_MS;

  beforeEach(() => {
    process.env.APIA_ENDPOINT_TEMPLATE = "http://example.test/apia?cui={cui}";
    process.env.APIA_TIMEOUT_MS = "5000";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (): Promise<Response> =>
          ({
            status: 404,
            ok: false,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({}),
          }) as Response,
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevTemplate === undefined) delete process.env.APIA_ENDPOINT_TEMPLATE;
    else process.env.APIA_ENDPOINT_TEMPLATE = prevTemplate;
    if (prevTimeout === undefined) delete process.env.APIA_TIMEOUT_MS;
    else process.env.APIA_TIMEOUT_MS = prevTimeout;
  });

  it("404 APIA → status not_found fără throw", async () => {
    const job = {
      id: "l1-1",
      data: {
        tenantId: "00000000-0000-4000-8000-000000000001",
        companyId: "00000000-0000-4000-8000-000000000002",
        cui: "RO123",
      },
    };
    const out = await apiaDataProcessor(job as never, {} as never);
    expect(out).toMatchObject({ ok: true, status: "not_found" });
    expect(fetch).toHaveBeenCalled();
  });
});
