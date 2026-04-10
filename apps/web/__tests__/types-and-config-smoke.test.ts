import { describe, it, expect } from "vitest";
import { COUNTIES, MOCK_COMPANIES } from "@/config/constants.js";
import { REFINE_RESOURCE_EXAMPLES } from "@/types/api.js";

describe("tipuri și constante (execuție pentru coverage)", () => {
  it("REFINE_RESOURCE_EXAMPLES este definit", () => {
    expect(REFINE_RESOURCE_EXAMPLES.length).toBeGreaterThan(0);
  });

  it("constantele demo sunt accesibile", () => {
    expect(MOCK_COMPANIES[0]?.name).toBeDefined();
    expect(COUNTIES.length).toBeGreaterThan(0);
  });
});
