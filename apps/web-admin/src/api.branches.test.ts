import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

import {
  drainQueue,
  fetchAdminLogs,
  fetchHealthDeps,
  fetchQueues,
  fetchSystemMetrics,
  getAdminSessionCorrelationId,
  getStoredAdminUser,
  loginAdmin,
  pauseQueue,
  postAdminFormData,
  resumeQueue,
  retryFailedQueue,
} from "./api.js";

describe("web-admin api — ramuri suplimentare", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    toastError.mockClear();
    vi.stubGlobal("crypto", { randomUUID: () => "00000000-0000-4000-8000-000000000001" });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("getStoredAdminUser: JSON invalid șterge cheia", () => {
    localStorage.setItem("cerniq_admin_user", "{");
    expect(getStoredAdminUser()).toBeNull();
    expect(localStorage.getItem("cerniq_admin_user")).toBeNull();
  });

  it("loginAdmin: răspuns fără succes aruncă mesajul din corp", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: "bad" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
    await expect(loginAdmin("a@b.c", "x")).rejects.toThrow("bad");
  });

  it("loginAdmin: lipsă token în ciuda success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
    await expect(loginAdmin("a@b.c", "x")).rejects.toThrow("Login failed");
  });

  it("fetchQueues / fetchSystemMetrics / fetchHealthDeps reușesc", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [{ name: "q" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { uptime: 1 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok", dependencies: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");

    await expect(fetchQueues()).resolves.toMatchObject({ success: true });
    await expect(fetchSystemMetrics()).resolves.toMatchObject({ success: true });
    await expect(fetchHealthDeps()).resolves.toMatchObject({ status: "ok" });
  });

  it("fetchAdminLogs limitează parametrul limit la 1–500", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      expect(url).toMatch(/limit=500$/);
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    await fetchAdminLogs(9999);
  });

  it("acțiuni coadă POST pe căile așteptate", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    await pauseQueue("my-q");
    await resumeQueue("my-q");
    await retryFailedQueue("my-q");
    await drainQueue("my-q");
    const urls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("/api/admin/queues/my-q/pause"))).toBe(true);
    expect(urls.some((u) => u.includes("/resume"))).toBe(true);
    expect(urls.some((u) => u.includes("/retry-failed"))).toBe(true);
    expect(urls.some((u) => u.includes("/drain"))).toBe(true);
  });

  it("401: refresh reușit apoi request-ul original reușește", async () => {
    localStorage.setItem("cerniq_admin_token", "old");
    localStorage.setItem("cerniq_admin_user", JSON.stringify({ role: "admin" }));
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("unauth", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { token: "fresh" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [{ name: "x" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ) as typeof fetch;

    const res = await fetchQueues();
    expect(res.success).toBe(true);
  });

  it("401 pe cale auth nu încearcă refresh", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("no", { status: 401 })) as typeof fetch;
    await expect(loginAdmin("a@b.c", "pw")).rejects.toThrow();
  });

  it("două 401 paralele: un singur POST /refresh", async () => {
    localStorage.setItem("cerniq_admin_token", "old");
    localStorage.setItem("cerniq_admin_user", JSON.stringify({ role: "admin" }));
    const ok = (body: unknown) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("a", { status: 401 }))
      .mockResolvedValueOnce(new Response("b", { status: 401 }))
      .mockResolvedValueOnce(ok({ success: true, data: { token: "tok2" } }))
      .mockResolvedValueOnce(ok({ success: true, data: [] }))
      .mockResolvedValueOnce(ok({ success: true, data: [] })) as typeof fetch;

    await Promise.all([fetchQueues(), fetchQueues()]);
    const refreshCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter((c) =>
      String(c[0]).includes("/refresh"),
    );
    expect(refreshCalls.length).toBe(1);
  });

  it("refresh: excepție la fetch → null", async () => {
    localStorage.setItem("cerniq_admin_token", "old");
    localStorage.setItem("cerniq_admin_user", JSON.stringify({ role: "admin" }));
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      const u = String(input);
      if (u.includes("/refresh")) {
        return Promise.reject(new Error("net"));
      }
      return Promise.resolve(new Response("u", { status: 401 }));
    }) as typeof fetch;
    await expect(fetchQueues()).rejects.toThrow();
  });

  it("401: refresh răspuns fără token → respinge", async () => {
    localStorage.setItem("cerniq_admin_token", "old");
    localStorage.setItem("cerniq_admin_user", JSON.stringify({ role: "admin" }));
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("u", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ) as typeof fetch;
    await expect(fetchQueues()).rejects.toThrow();
  });

  it("401: refresh eșuează → respinge", async () => {
    localStorage.setItem("cerniq_admin_token", "old");
    localStorage.setItem("cerniq_admin_user", JSON.stringify({ role: "admin" }));
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("unauth", { status: 401 }))
      .mockResolvedValueOnce(new Response("no refresh", { status: 401 })) as typeof fetch;
    await expect(fetchQueues()).rejects.toThrow();
  });

  it("500 cu details.errorId non-string nu folosește toast cu ID", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "x",
          details: { errorId: 42 },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    await expect(fetchQueues()).rejects.toThrow();
    expect(toastError).not.toHaveBeenCalledWith(expect.stringContaining("ID:"));
  });

  it("500 cu details fără câmp errorId nu folosește toast cu ID", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "x",
          details: { reason: "other" },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    await expect(fetchQueues()).rejects.toThrow();
    expect(toastError).not.toHaveBeenCalledWith(expect.stringContaining("ID:"));
  });

  it("500 cu errorId gol nu folosește toast cu ID", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "x",
          details: { errorId: "" },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    await expect(fetchQueues()).rejects.toThrow();
    expect(toastError).not.toHaveBeenCalledWith(expect.stringContaining("ID:"));
  });

  it("eroare server 500 cu errorId → toast", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "x",
          details: { errorId: "e-1" },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    await expect(fetchQueues()).rejects.toThrow();
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining("e-1"));
  });

  it("eroare 503 → toast generic", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("x", { status: 503 })) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    await expect(fetchQueues()).rejects.toThrow();
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining("indisponibil"));
  });

  it("getAdminSessionCorrelationId citește sessionStorage existent", () => {
    sessionStorage.setItem("cerniq_admin_x_correlation_id", "cid-1");
    expect(getAdminSessionCorrelationId()).toBe("cid-1");
  });

  it("POST FormData: păstrează corpul multipart fără Content-Type forțat", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    const fd = new FormData();
    fd.append("f", "1");
    await postAdminFormData("/api/admin/upload", fd);
    const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(opts.body).toBe(fd);
    const hdrs = opts.headers as Headers;
    expect(hdrs.get("Content-Type")).toBeNull();
  });

  it("cale relativă fără / inițial este normalizată", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    await postAdminFormData("api/admin/ping", new FormData());
    expect(String((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])).toMatch(
      /\/api\/admin\/ping$/,
    );
  });

  it("postAdminFormData cu URL absolut nu concatenează apiBase", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    const fd = new FormData();
    await postAdminFormData("https://other.test/upload", fd);
    expect(String((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])).toBe(
      "https://other.test/upload",
    );
  });

  it("antete: Authorization existent nu este suprascris", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
    const fd = new FormData();
    const headers = new Headers();
    headers.set("Authorization", "Bearer preset");
    await postAdminFormData("/api/x", fd, { headers });
    const out = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers as Headers;
    expect(out.get("Authorization")).toBe("Bearer preset");
  });

  it("antete: x-correlation-id preset nu este suprascris", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    const headers = new Headers();
    headers.set("x-correlation-id", "preset-cid");
    await postAdminFormData("/api/admin/x", new FormData(), { headers });
    const out = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers as Headers;
    expect(out.get("x-correlation-id")).toBe("preset-cid");
  });

  it("corp eroare non-JSON → mesaj HTTP", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("plain", { status: 502 })) as typeof fetch;
    localStorage.setItem("cerniq_admin_token", "t");
    await expect(fetchQueues()).rejects.toThrow("HTTP 502");
  });
});
