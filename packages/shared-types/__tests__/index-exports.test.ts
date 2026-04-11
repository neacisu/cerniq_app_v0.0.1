import { describe, expect, it } from "vitest";
import * as PublicApi from "../src/index.js";

describe("index barrel", () => {
  it("exportă primitivele de identificare și hărți de coloane", () => {
    expect(PublicApi.sanitizeCui).toBeTypeOf("function");
    expect(PublicApi.COLUMN_MAPPING_DEFINITIONS.length).toBeGreaterThan(0);
    expect(PublicApi.CompanySchema).toBeDefined();
  });
});
