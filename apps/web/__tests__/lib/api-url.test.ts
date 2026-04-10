/**
 * Contract: getApiBase() folosește import.meta.env (înlocuit la build în Vite) + window.location.
 * Ramurile VITE_API_URL și DEV=false nu sunt suprascrise de vi.stubEnv în mod fiabil — acoperite implicit
 * de integrare; aici testăm ramurile bazate pe location în mediul Vitest (DEV=true).
 */
import { describe, it, expect, vi, afterEach } from "vitest";

async function loadGetApiBase() {
  vi.resetModules();
  const mod = await import("@/lib/api-url.js");
  return mod.getApiBase;
}

describe("getApiBase", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "location");

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "location", originalDescriptor);
    }
  });

  it("localhost cu DEV (implicit în Vitest) → bază goală", async () => {
    vi.stubEnv("VITE_API_URL", "");
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      writable: true,
      value: { hostname: "localhost", protocol: "http:" },
    });
    const getApiBase = await loadGetApiBase();
    expect(getApiBase()).toBe("");
  });

  it("hostname dev.* + DEV → bază goală", async () => {
    vi.stubEnv("VITE_API_URL", "");
    vi.stubEnv("DEV", true);
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      writable: true,
      value: { hostname: "dev.app.example.com", protocol: "https:" },
    });
    const getApiBase = await loadGetApiBase();
    expect(getApiBase()).toBe("");
  });

  it("hostname admin.* → api pe domeniul fără prefix admin", async () => {
    vi.stubEnv("VITE_API_URL", "");
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      writable: true,
      value: { hostname: "admin.cerniq.ro", protocol: "https:" },
    });
    const getApiBase = await loadGetApiBase();
    expect(getApiBase()).toBe("https://api.cerniq.ro");
  });

  it("hostname obișnuit → api.<hostname>", async () => {
    vi.stubEnv("VITE_API_URL", "");
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      writable: true,
      value: { hostname: "app.client.com", protocol: "https:" },
    });
    const getApiBase = await loadGetApiBase();
    expect(getApiBase()).toBe("https://api.app.client.com");
  });
});

describe("requestRedirectToLogin", () => {
  it("emite evenimentul cerniq:redirect-to-login", async () => {
    const { REDIRECT_LOGIN_EVENT, requestRedirectToLogin } = await import("@/lib/api-url.js");
    const spy = vi.spyOn(globalThis, "dispatchEvent");
    requestRedirectToLogin();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: REDIRECT_LOGIN_EVENT }));
    spy.mockRestore();
  });
});
