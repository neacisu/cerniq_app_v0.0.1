import { describe, it, expect } from "vitest";
import { isSafeImportStoredPath } from "./o3-import-file-cleanup.js";

describe("isSafeImportStoredPath", () => {
  it("acceptă path absolut nevid", () => {
    expect(isSafeImportStoredPath("/app/data/imports/x.csv")).toBe(true);
  });

  it("respinge gol, relativ sau non-string", () => {
    expect(isSafeImportStoredPath("")).toBe(false);
    expect(isSafeImportStoredPath("relative/path")).toBe(false);
    expect(isSafeImportStoredPath(null)).toBe(false);
  });
});
