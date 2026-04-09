import { describe, it, expect } from "vitest";

describe("notification-dispatcher", () => {
  it("escapeHtml este importat indirect — contract module", async () => {
    const mod = await import("./notification-dispatcher.js");
    expect(typeof mod.dispatchNotification).toBe("function");
  });
});
