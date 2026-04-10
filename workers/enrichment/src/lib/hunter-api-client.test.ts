import { createHash } from "node:crypto";
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
  process.env.HUNTER_API_KEY = "test-hunter-key";
});

describe("hunterDomainSearch", () => {
  it("returns mapped result and logs start + success", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_provider: string, fn: () => unknown) => fn()),
    }));

    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          domain: "example.com",
          emails: [{ value: "a@example.com", confidence: 99 }],
        },
      }),
    }));
    vi.stubGlobal("fetch", mockFetch);

    const { hunterDomainSearch } = await import("./hunter-api-client.js");
    const result = await hunterDomainSearch("example.com");

    expect(result).toEqual({
      domain: "example.com",
      emails: [{ value: "a@example.com", confidence: 99 }],
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCalls = mockFetch.mock.calls as unknown[][];
    const fetchUrl = String(fetchCalls[0]?.[0] ?? "");
    expect(fetchUrl).toContain("api_key=test-hunter-key");
    expect(fetchUrl).not.toMatch(/api_key=$/);
    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "hunter_request_start",
        endpointPath: "/domain-search",
        domain: "example.com",
      }),
    );
    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "hunter_request_success",
        statusCode: 200,
        endpointPath: "/domain-search",
      }),
    );
  });

  it("404 returns null and logs debug, not error", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_provider: string, fn: () => unknown) => fn()),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, text: async () => "" })),
    );

    const { hunterDomainSearch } = await import("./hunter-api-client.js");
    const result = await hunterDomainSearch("missing.example");

    expect(result).toBeNull();
    expect(mockDebug).toHaveBeenCalledWith(
      expect.objectContaining({ event: "hunter_not_found", statusCode: 404 }),
    );
    expect(mockError).not.toHaveBeenCalled();
  });

  it("5xx triggers error log and Error with cause", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_provider: string, fn: () => unknown) => fn()),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
        text: async () => "unavailable",
      })),
    );

    const { hunterDomainSearch } = await import("./hunter-api-client.js");
    const err = await hunterDomainSearch("x.com").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/Hunter API \[503\]/);
    expect((err as Error).cause).toBeInstanceOf(Error);
    expect(mockError).toHaveBeenCalledWith(
      expect.objectContaining({ event: "hunter_http_error", httpStatus: 503 }),
    );
  });

  it("4xx (non-404) uses warn, not error", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_provider: string, fn: () => unknown) => fn()),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () => "bad request",
      })),
    );

    const { hunterDomainSearch } = await import("./hunter-api-client.js");
    await expect(hunterDomainSearch("x.com")).rejects.toThrow(/Hunter API \[400\]/);
    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({ event: "hunter_http_error", httpStatus: 400 }),
    );
    expect(mockError).not.toHaveBeenCalled();
  });
});

describe("hunterEmailVerify", () => {
  it("logs emailHashPrefix, never raw email in logger payloads", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_provider: string, fn: () => unknown) => fn()),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            email: "u@example.com",
            status: "valid",
            score: 80,
            result: "deliverable",
          },
        }),
      })),
    );

    const { hunterEmailVerify } = await import("./hunter-api-client.js");
    const email = "user@example.com";
    const expectedPrefix = createHash("sha256").update(email, "utf8").digest("hex").slice(0, 12);

    const result = await hunterEmailVerify(email);
    expect(result?.email).toBe("u@example.com");
    expect(result?.status).toBe("valid");

    const startCall = mockInfo.mock.calls.find(
      (c) => (c[0] as { event?: string })?.event === "hunter_request_start",
    );
    expect(startCall?.[0]).toMatchObject({
      emailHashPrefix: expectedPrefix,
      endpointPath: "/email-verifier",
    });
    const allInfo = JSON.stringify(mockInfo.mock.calls);
    const allErr = JSON.stringify(mockError.mock.calls);
    expect(allInfo + allErr).not.toContain("user@example.com");
  });

  it("invalid JSON throws with cause", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_provider: string, fn: () => unknown) => fn()),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("bad json");
        },
      })),
    );

    const { hunterEmailVerify } = await import("./hunter-api-client.js");
    const err = await hunterEmailVerify("a@b.co").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/invalid JSON/);
    expect((err as Error).cause).toBeInstanceOf(SyntaxError);
  });
});

describe("hunterGet missing key", () => {
  it("throws and logs when HUNTER_API_KEY is empty", async () => {
    delete process.env.HUNTER_API_KEY;

    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_provider: string, fn: () => unknown) => fn()),
    }));

    const { hunterDomainSearch } = await import("./hunter-api-client.js");
    await expect(hunterDomainSearch("d.com")).rejects.toThrow(/Missing HUNTER_API_KEY/);
    expect(mockError).toHaveBeenCalledWith(
      expect.objectContaining({ event: "hunter_request_error", reason: "missing_api_key" }),
    );
  });
});
