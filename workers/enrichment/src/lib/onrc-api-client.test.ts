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
  process.env.ONRC_API_KEY = "o-key";
  process.env.ONRC_API_URL = "https://portal.onrc.example/api";
});

describe("getOnrcData", () => {
  it("logs endpoint company for root path", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ name: "X" }),
      })),
    );

    const { getOnrcData } = await import("./onrc-api-client.js");
    const r = await getOnrcData("RO123");
    expect(r).toEqual({ name: "X" });
    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "onrc_request_start",
        cui: "RO123",
        endpoint: "company",
        endpointPath: "/companies/RO123",
      }),
    );
  });

  it("404 on subresource", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, text: async () => "" })),
    );

    const { getOnrcSedii } = await import("./onrc-api-client.js");
    expect(await getOnrcSedii("c1")).toBeNull();
    expect(mockDebug).toHaveBeenCalledWith(
      expect.objectContaining({ event: "onrc_not_found", endpoint: "sedii" }),
    );
  });

  it("4xx uses warn", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        text: async () => "nope",
      })),
    );

    const { getOnrcHistory } = await import("./onrc-api-client.js");
    await expect(getOnrcHistory("c1")).rejects.toThrow(/ONRC API \[403\]/);
    expect(mockWarn).toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });
});
