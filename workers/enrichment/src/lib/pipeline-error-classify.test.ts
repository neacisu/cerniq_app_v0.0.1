import { describe, expect, it } from "vitest";
import { classifyErrorType } from "./pipeline-error-classify.js";

describe("classifyErrorType", () => {
  it("RATE_LIMITED pentru 429", () => {
    expect(classifyErrorType({ status: 429 })).toBe("RATE_LIMITED");
  });

  it("AUTH_ERROR pentru 401", () => {
    expect(classifyErrorType({ status: 401 })).toBe("AUTH_ERROR");
  });

  it("NETWORK_ERROR pentru ECONNREFUSED", () => {
    const e = new Error("fail") as NodeJS.ErrnoException;
    e.code = "ECONNREFUSED";
    expect(classifyErrorType(e)).toBe("NETWORK_ERROR");
  });

  it("DATA_NOT_FOUND pentru 404", () => {
    expect(classifyErrorType({ statusCode: 404 })).toBe("DATA_NOT_FOUND");
  });

  it("VALIDATION_ERROR pentru mesaj invalid", () => {
    expect(classifyErrorType(new Error("invalid payload schema"))).toBe("VALIDATION_ERROR");
  });

  it("PERMANENT_FAILURE implicit", () => {
    expect(classifyErrorType(new Error("something else"))).toBe("PERMANENT_FAILURE");
  });
});
