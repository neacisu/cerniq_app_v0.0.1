import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api.js")>();
  return {
    ...actual,
    getAdminSessionCorrelationId: () => "",
  };
});

import { reportAdminClientError } from "./report-client-error.js";

describe("reportAdminClientError fără correlation id", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("nu trimite x-correlation-id când id-ul e gol", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 })) as typeof fetch;
    vi.stubGlobal("navigator", { userAgent: "ua" });
    await reportAdminClientError({ message: "m" });
    const raw = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
    const hdrs = raw instanceof Headers ? raw : new Headers(raw as HeadersInit);
    expect(hdrs.get("x-correlation-id")).toBeNull();
  });
});
