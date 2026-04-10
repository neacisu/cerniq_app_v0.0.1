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
  process.env.TERMENE_API_KEY = "t-key";
  process.env.TERMENE_API_URL = "https://api.termene.example/v2";
});

describe("getTermeneBalance", () => {
  it("success logs dataType bilant + cui", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })),
    );

    const { getTermeneBalance } = await import("./termene-api-client.js");
    const r = await getTermeneBalance("123");
    expect(r).toEqual({ ok: true });
    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "termene_request_start",
        cui: "123",
        dataType: "bilant",
        endpointPath: "/firme/123/bilant",
      }),
    );
    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({ event: "termene_request_success", statusCode: 200 }),
    );
  });

  it("404 is null + debug", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, text: async () => "" })),
    );

    const { getTermeneRisk } = await import("./termene-api-client.js");
    expect(await getTermeneRisk("99")).toBeNull();
    expect(mockDebug).toHaveBeenCalledWith(
      expect.objectContaining({ event: "termene_not_found", dataType: "scor-risc" }),
    );
  });

  it("5xx error + cause", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 502,
        text: async () => "bad",
      })),
    );

    const { getTermeneDosare } = await import("./termene-api-client.js");
    const err = await getTermeneDosare("1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).cause).toBeInstanceOf(Error);
    expect(mockError).toHaveBeenCalledWith(
      expect.objectContaining({ event: "termene_http_error", httpStatus: 502 }),
    );
  });

  it("missing key", async () => {
    delete process.env.TERMENE_API_KEY;
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));

    const { getTermeneActionari } = await import("./termene-api-client.js");
    await expect(getTermeneActionari("1")).rejects.toThrow(/Missing TERMENE_API_KEY/);
    expect(mockError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "missing_api_key", dataType: "actionari" }),
    );
  });
});
