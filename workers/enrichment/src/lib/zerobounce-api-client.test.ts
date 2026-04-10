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
  process.env.ZEROBOUNCE_API_KEY = "zb-key";
});

describe("zerobounceValidate", () => {
  it("success logs emailHashPrefix and validationStatus, never raw email", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ status: "valid", sub_status: "" }),
      })),
    );

    const email = "secret@user.com";
    const prefix = createHash("sha256").update(email, "utf8").digest("hex").slice(0, 12);

    const { zerobounceValidate } = await import("./zerobounce-api-client.js");
    const r = await zerobounceValidate(email);
    expect(r?.status).toBe("valid");

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "zerobounce_request_success",
        emailHashPrefix: prefix,
        validationStatus: "valid",
      }),
    );
    const logged = JSON.stringify(mockInfo.mock.calls) + JSON.stringify(mockError.mock.calls);
    expect(logged).not.toContain("secret@user.com");
  });

  it("invalid JSON body throws with cause", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("oops");
        },
      })),
    );

    const { zerobounceValidate } = await import("./zerobounce-api-client.js");
    const err = await zerobounceValidate("a@b.c").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).cause).toBeInstanceOf(SyntaxError);
  });
});
