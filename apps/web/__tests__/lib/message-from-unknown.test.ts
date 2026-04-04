import { describe, it, expect } from "vitest";
import { ApiError, messageFromUnknown } from "@/lib/api.js";

describe("messageFromUnknown", () => {
  it("returns ApiError.message for ApiError instances", () => {
    expect(messageFromUnknown(new ApiError("nope", 400))).toBe("nope");
  });

  it("returns Error.message for generic Error", () => {
    expect(messageFromUnknown(new Error("fail"))).toBe("fail");
  });

  it("stringifies other values", () => {
    expect(messageFromUnknown(42)).toBe("42");
    expect(messageFromUnknown("plain")).toBe("plain");
  });
});
