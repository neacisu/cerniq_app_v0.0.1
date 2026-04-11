import { afterEach, describe, expect, it, vi } from "vitest";

describe("api — fără window", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("getStoredAdminToken întoarce null", async () => {
    vi.stubGlobal("window", undefined);
    const { getStoredAdminToken, persistAdminAuth } = await import("./api.js");
    expect(getStoredAdminToken()).toBeNull();
    persistAdminAuth("t", { role: "admin" });
    expect(getStoredAdminToken()).toBeNull();
  });

  it("getStoredAdminUser întoarce null fără window", async () => {
    vi.stubGlobal("window", undefined);
    const { getStoredAdminUser } = await import("./api.js");
    expect(getStoredAdminUser()).toBeNull();
  });
});
