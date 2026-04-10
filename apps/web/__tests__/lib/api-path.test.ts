import { describe, it, expect } from "vitest";
import { resourceToApiPath } from "@/lib/api-path.js";

describe("resourceToApiPath", () => {
  it("prefixează resurse scurte cu /api/v1/", () => {
    expect(resourceToApiPath("products")).toBe("/api/v1/products");
    expect(resourceToApiPath("/foo/bar/")).toBe("/api/v1/foo/bar");
  });

  it("păstrează prefixul v1/ ca /api/v1/...", () => {
    expect(resourceToApiPath("v1/negotiation")).toBe("/api/v1/negotiation");
  });

  it("normalizează api/v1/ fără slash inițial", () => {
    expect(resourceToApiPath("api/v1/x")).toBe("/api/v1/x");
  });

  it("păstrează api/v1/ cu slash inițial", () => {
    expect(resourceToApiPath("/api/v1/x")).toBe("/api/v1/x");
  });
});
