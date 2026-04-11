import { describe, expect, it } from "vitest";
import { COLUMN_MAPPING_DEFINITIONS, buildColumnAliasToTargetMap } from "../src/column-mapping.js";

describe("COLUMN_MAPPING_DEFINITIONS", () => {
  it("este nevidă și fiecare intrare are câmpuri obligatorii", () => {
    expect(COLUMN_MAPPING_DEFINITIONS.length).toBeGreaterThan(0);
    for (const entry of COLUMN_MAPPING_DEFINITIONS) {
      expect(entry.key.length).toBeGreaterThan(0);
      expect(entry.label.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.aliases)).toBe(true);
      expect(entry.aliases.length).toBeGreaterThan(0);
    }
  });

  it("are chei canonice unice", () => {
    const keys = COLUMN_MAPPING_DEFINITIONS.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("buildColumnAliasToTargetMap", () => {
  it("mapează aliasurile normalizate la chei canonice", () => {
    const normalize = (s: string) => s.trim().toLowerCase();
    const map = buildColumnAliasToTargetMap(normalize);
    expect(map.get("cui")).toBe("cui");
    expect(map.get("email")).toBe("email");
    expect(map.get("denumire firma")).toBe("companyName");
  });

  it("respectă funcția de normalizare furnizată", () => {
    const identity = (s: string) => s;
    const map = buildColumnAliasToTargetMap(identity);
    expect(map.get("cui")).toBe("cui");
    expect(map.get("CUI")).toBeUndefined();
  });
});
