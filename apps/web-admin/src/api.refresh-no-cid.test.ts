import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./admin-session-correlation.js", () => ({
  getAdminSessionCorrelationId: () => "",
}));

import { fetchQueues } from "./api.js";

describe("refresh admin fără x-correlation-id", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.setItem("cerniq_admin_token", "old");
    localStorage.setItem("cerniq_admin_user", JSON.stringify({ role: "admin" }));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POST /refresh nu include x-correlation-id când id-ul e gol", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("a", { status: 401 }))
      .mockImplementation((input: RequestInfo, init?: RequestInit) => {
        const u = String(input);
        if (u.includes("/refresh")) {
          const h = new Headers(init?.headers);
          expect(h.get("x-correlation-id")).toBeNull();
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, data: { token: "t" } }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }) as typeof fetch;

    await fetchQueues();
  });
});
