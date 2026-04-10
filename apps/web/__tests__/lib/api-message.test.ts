import { describe, it, expect } from "vitest";
import { ApiError, messageFromUnknown } from "@/lib/api.js";

describe("messageFromUnknown", () => {
  it("extrage mesajul din ApiError", () => {
    expect(messageFromUnknown(new ApiError("x", 400))).toBe("x");
  });

  it("extrage mesajul din Error generic", () => {
    expect(messageFromUnknown(new Error("oops"))).toBe("oops");
  });

  it("stringifică valori non-Error", () => {
    expect(messageFromUnknown(42)).toBe("42");
  });
});
