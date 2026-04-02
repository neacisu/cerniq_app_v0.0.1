/**
 * Teste izolate pentru getOblioAccessToken — token caching (oblio-client.ts)
 *
 * IMPORTANT: Acest fișier NU aplică vi.mock("../lib/oblio-client.js").
 * Testele necesită implementarea REALĂ (nu mock) pentru a verifica
 * comportamentul cache-ului de token la nivel de modul.
 *
 * Patternul corect Vitest pentru module cu stare la nivel de modul:
 *   vi.resetModules() + await import(...) → fresh instance, cache resetat
 *
 * De ce fișier separat:
 *   h-workers.test.ts aplică vi.mock("../lib/oblio-client.js") la nivel global,
 *   ceea ce interceptează TOATE importurile, inclusiv cele dinamice din teste.
 *   Separarea garantează că aceste teste primesc implementarea reală.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
  delete process.env["OBLIO_CLIENT_ID"];
  delete process.env["OBLIO_CLIENT_SECRET"];
});

// =============================================================================
// getOblioAccessToken — token caching
// Testăm implementarea REALĂ: fetch → cache 1h → refresh la expirare
// =============================================================================

describe("getOblioAccessToken — token caching (implementare reală)", () => {
  it("token lipsă → face HTTP request și returnează access_token", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "new-token-abc",
        expires_in: "3600",
        token_type: "Bearer",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getOblioAccessToken } = await import("../lib/oblio-client.js");

    const token = await getOblioAccessToken();
    expect(token).toBe("new-token-abc");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("token valid în cache → al doilea apel NU face HTTP request", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "cached-token",
        expires_in: "3600",
        token_type: "Bearer",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getOblioAccessToken } = await import("../lib/oblio-client.js");

    // Primul apel populează cache-ul
    await getOblioAccessToken();
    fetchMock.mockClear();

    // Al doilea apel imediat → trebuie să returneze din cache
    const token = await getOblioAccessToken();
    expect(token).toBe("cached-token");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("token expirat (>3600s) → face nou request HTTP", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "refreshed-token",
        expires_in: "3600",
        token_type: "Bearer",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getOblioAccessToken } = await import("../lib/oblio-client.js");

    // Populăm cache-ul
    await getOblioAccessToken();
    fetchMock.mockClear();

    // Avansăm cu mai mult de 3600s + 60s buffer → token expirat
    vi.advanceTimersByTime(3700 * 1000);

    await getOblioAccessToken();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("caching correct — expiresAt calculat din expires_in (7200s)", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "token-exp-check",
        expires_in: "7200",
        token_type: "Bearer",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getOblioAccessToken } = await import("../lib/oblio-client.js");

    await getOblioAccessToken();
    fetchMock.mockClear();

    // Avansăm cu 7000s (sub 7200s - 60s buffer = 7140s) → cache încă valid
    vi.advanceTimersByTime(7000 * 1000);
    await getOblioAccessToken();
    expect(fetchMock).not.toHaveBeenCalled();

    // Avansăm cu încă 200s (total >7140s buffer) → expirat → refresh
    vi.advanceTimersByTime(200 * 1000);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "token-renewed",
        expires_in: "3600",
        token_type: "Bearer",
      }),
    });
    await getOblioAccessToken();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("OBLIO_CLIENT_ID și OBLIO_CLIENT_SECRET citite din env (OpenBao injection)", async () => {
    vi.resetModules();
    process.env["OBLIO_CLIENT_ID"] = "env-client-id-test";
    process.env["OBLIO_CLIENT_SECRET"] = "env-secret-test";

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "env-token",
        expires_in: "3600",
        token_type: "Bearer",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getOblioAccessToken } = await import("../lib/oblio-client.js");

    await getOblioAccessToken();

    expect(fetchMock).toHaveBeenCalledOnce();
    const callArgs = fetchMock.mock.calls[0];
    const body = callArgs[1]?.body as string;
    expect(body).toContain("client_id=env-client-id-test");
    expect(body).toContain("client_secret=env-secret-test");
  });
});
