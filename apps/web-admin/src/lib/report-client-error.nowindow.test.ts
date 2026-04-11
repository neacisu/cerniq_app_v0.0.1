import { afterEach, describe, expect, it, vi } from "vitest";

describe("reportAdminClientError fără window", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("iese imediat", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.stubGlobal("window", undefined);
    const { reportAdminClientError } = await import("./report-client-error.js");
    await reportAdminClientError({ message: "x" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
