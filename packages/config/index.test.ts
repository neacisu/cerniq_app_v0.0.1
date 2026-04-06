import { describe, expect, it } from "vitest";
import { CERNIQ_APP_SERVICE_PORTS, CONFIG_PACKAGE } from "./index";

describe("@cerniq/config", () => {
  it("exports the package identifier", () => {
    expect(CONFIG_PACKAGE).toBe("@cerniq/config");
  });

  it("exportă porturi canonice în range-ul ADR-0022 (64000–64099)", () => {
    for (const p of Object.values(CERNIQ_APP_SERVICE_PORTS)) {
      expect(p).toBeGreaterThanOrEqual(64000);
      expect(p).toBeLessThanOrEqual(64099);
    }
    expect(CERNIQ_APP_SERVICE_PORTS.api).toBe(64010);
    expect(CERNIQ_APP_SERVICE_PORTS.web).toBe(64000);
  });
});
