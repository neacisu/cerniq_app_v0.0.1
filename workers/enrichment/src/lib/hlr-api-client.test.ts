import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInfo = vi.fn();
const mockError = vi.fn();
const mockWarn = vi.fn();
const mockDebug = vi.fn();

vi.mock("@cerniq/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: mockInfo,
    error: mockError,
    warn: mockWarn,
    debug: mockDebug,
  })),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  process.env.HLR_API_URL = "https://hlr.example.com/lookup";
  process.env.HLR_API_KEY = "hlr-secret";
});

describe("hlrLookup", () => {
  it("logs hlrHost and phoneLast4 only, not full URL", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok", reachable: true, carrier: "ACME" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { hlrLookup } = await import("./hlr-api-client.js");
    const r = await hlrLookup("+40740123456");
    expect(r?.carrier).toBe("ACME");

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "hlr_request_start",
        hlrHost: "hlr.example.com",
        phoneLast4: "3456",
      }),
    );
    const logged = JSON.stringify(mockInfo.mock.calls);
    expect(logged).not.toContain("hlr-secret");
    const fetchCalls = fetchMock.mock.calls as unknown[][];
    expect(String(fetchCalls[0]?.[0] ?? "")).toContain("api_key=hlr-secret");
  });

  it("missing config throws", async () => {
    delete process.env.HLR_API_KEY;
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));

    const { hlrLookup } = await import("./hlr-api-client.js");
    await expect(hlrLookup("+40123")).rejects.toThrow(/Missing HLR_API/);
  });
});
