/**
 * Comportament apiFetch / api.* — fetch mock, JSON vs text, erori, Content-Type.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { requestRedirectToLogin } = vi.hoisted(() => ({
  requestRedirectToLogin: vi.fn(),
}));

vi.mock("@/lib/api-url.js", () => ({
  getApiBase: () => "http://test.local",
  requestRedirectToLogin,
}));

import { ApiError, api, apiFetch, getStoredToken, setOnAuthClearedListener } from "@/lib/api.js";

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("apiFetch și api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    requestRedirectToLogin.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    localStorage.clear();
    setOnAuthClearedListener(null);
  });

  afterEach(() => {
    setOnAuthClearedListener(null);
  });

  it("GET: răspuns JSON devine obiect", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ hello: 1 }));
    await expect(api.get<{ hello: number }>("/api/v1/x")).resolves.toEqual({ hello: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://test.local/api/v1/x",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("GET: fără application/json returnează text", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("plain", { status: 200, headers: { "Content-Type": "text/plain" } }),
    );
    await expect(apiFetch<string>("/api/v1/plain")).resolves.toBe("plain");
  });

  it("GET 404: aruncă ApiError cu mesaj din body", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "not here" }, 404));
    await expect(apiFetch("/api/v1/missing")).rejects.toMatchObject({
      status: 404,
      message: "not here",
    });
  });

  it("POST trimite JSON și setează Content-Type când body e obiect", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await api.post("/api/v1/p", { a: 1 });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect((init?.headers as Headers).get("Content-Type")).toContain("application/json");
    expect(init?.body).toBe(JSON.stringify({ a: 1 }));
  });

  it("POST cu FormData nu forțează Content-Type JSON", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const fd = new FormData();
    fd.set("f", "v");
    await api.post("/api/v1/upload", fd);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.body).toBe(fd);
    const h = init?.headers as Headers;
    expect(h.has("Content-Type")).toBe(false);
  });

  it("getStoredToken citește localStorage", () => {
    expect(getStoredToken()).toBeNull();
    localStorage.setItem("cerniq_token", "tok");
    expect(getStoredToken()).toBe("tok");
  });

  it("401 pe rută ne-auth: refresh eșuează → listener auth cleared și ApiError", async () => {
    const onCleared = vi.fn();
    setOnAuthClearedListener(onCleared);
    localStorage.setItem("cerniq_token", "old");

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { status: 401 }));

    await expect(api.get("/api/v1/protected")).rejects.toBeInstanceOf(ApiError);
    expect(onCleared).toHaveBeenCalled();
    expect(requestRedirectToLogin).toHaveBeenCalled();
    expect(localStorage.getItem("cerniq_token")).toBeNull();
  });
});
