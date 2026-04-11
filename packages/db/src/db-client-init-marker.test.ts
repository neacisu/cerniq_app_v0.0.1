import { afterEach, describe, expect, it, vi } from "vitest";

describe("db-client-init-marker", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("înregistrează o singură dată momentul inițializării clientului", async () => {
    const m1 = await import("./db-client-init-marker.js");
    expect(m1.getDbClientInitPerformanceMs()).toBeUndefined();
    m1.markDbClientInitNow();
    const t = m1.getDbClientInitPerformanceMs();
    expect(typeof t).toBe("number");
    m1.markDbClientInitNow();
    expect(m1.getDbClientInitPerformanceMs()).toBe(t);
  });
});
