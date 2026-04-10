import { describe, it, expect } from "vitest";
import { buildJ4SilverUpdatesFromFoundData } from "./j4-ai-fallback.js";

describe("buildJ4SilverUpdatesFromFoundData", () => {
  it("ignoră câmpuri cu încredere sub prag și câmpuri nepermise", () => {
    const { updates, applied } = buildJ4SilverUpdatesFromFoundData({
      email: { value: "a@b.co", confidence: 0.59 },
      hacker: { value: "x", confidence: 1 },
    });
    expect(Object.keys(updates)).toHaveLength(0);
    expect(applied).toHaveLength(0);
  });

  it("mapează cod_caen_principal → codCaenPrincipal", () => {
    const { updates, applied } = buildJ4SilverUpdatesFromFoundData({
      cod_caen_principal: { value: "0111", confidence: 0.9 },
    });
    expect(updates.codCaenPrincipal).toBe("0111");
    expect(applied).toEqual(["cod_caen_principal"]);
  });
});
