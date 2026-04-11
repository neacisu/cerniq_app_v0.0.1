import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildAdminClientErrorIdempotencyKey,
  reportAdminClientError,
} from "./report-client-error.js";

describe("buildAdminClientErrorIdempotencyKey", () => {
  it("este determinist pentru același input", () => {
    const input = {
      message: "Admin boundary",
      stack: "at x (y.js:1:1)",
      source: "ErrorBoundary",
    };
    expect(buildAdminClientErrorIdempotencyKey(input)).toBe(
      buildAdminClientErrorIdempotencyKey(input),
    );
  });

  it("respectă trunchierea (același prefix mesaj → aceeași cheie)", () => {
    const a = { message: "x".repeat(5000) };
    const b = { message: "x".repeat(4000) + "tail" };
    expect(buildAdminClientErrorIdempotencyKey(a)).toBe(buildAdminClientErrorIdempotencyKey(b));
  });

  it("FNV pe code points (paritate comportament Unicode cu apps/web)", () => {
    const rocket = "\uD83D\uDE80";
    const k = buildAdminClientErrorIdempotencyKey({ message: `x${rocket}y` });
    expect(k).toMatch(/^xfe:[0-9a-f]+$/);
  });

  it("oprire sigură dacă codePointAt întoarce undefined", () => {
    const spy = vi.spyOn(String.prototype, "codePointAt").mockReturnValueOnce(undefined as never);
    const k = buildAdminClientErrorIdempotencyKey({ message: "x" });
    expect(k).toMatch(/^xfe:[0-9a-f]+$/);
    spy.mockRestore();
  });
});

describe("reportAdminClientError", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    sessionStorage.setItem("cerniq_admin_x_correlation_id", "cid-r");
    vi.stubGlobal("navigator", { userAgent: "vitest-ua" });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("trimite POST către /api/v1/errors/client", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 })) as typeof fetch;
    await reportAdminClientError({ message: "boom", stack: "st", source: "unit" });
    const url = String((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(url).toMatch(/\/api\/v1\/errors\/client$/);
    const body = JSON.parse(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    );
    expect(body.message).toBe("boom");
    expect(body.name).toBe("WebAdminError");
  });

  it("429 nu propagă eroare", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 429 })) as typeof fetch;
    await expect(reportAdminClientError({ message: "x" })).resolves.toBeUndefined();
  });

  it("echec rețea nu propagă", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("offline")) as typeof fetch;
    await expect(reportAdminClientError({ message: "x" })).resolves.toBeUndefined();
  });
});
