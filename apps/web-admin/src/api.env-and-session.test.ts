import { afterEach, describe, expect, it, vi } from "vitest";

describe("api — mediu izolat (resetModules)", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("apiBase citește VITE_API_URL", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.custom/");
    const { apiBase } = await import("./api.js");
    expect(apiBase).toBe("https://api.custom");
  });

  it("getAdminSessionCorrelationId: fallback când sessionStorage aruncă", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "fallback-uuid-1" });
    const spy = vi.spyOn(globalThis.sessionStorage, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { getAdminSessionCorrelationId } = await import("./api.js");
    expect(getAdminSessionCorrelationId()).toBe("fallback-uuid-1");
    spy.mockRestore();
  });

  it("getAdminSessionCorrelationId: setItem aruncă după getItem gol", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "fallback-uuid-2" });
    vi.resetModules();
    const g = vi.spyOn(globalThis.sessionStorage, "getItem").mockReturnValue(null);
    const s = vi.spyOn(globalThis.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { getAdminSessionCorrelationId } = await import("./api.js");
    expect(getAdminSessionCorrelationId()).toBe("fallback-uuid-2");
    g.mockRestore();
    s.mockRestore();
  });
});
