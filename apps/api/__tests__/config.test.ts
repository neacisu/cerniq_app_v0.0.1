import { describe, it, expect } from "vitest";
import { envConfig } from "../src/config.js";

describe("Environment Config", () => {
  it("has default PORT", () => {
    expect(typeof envConfig.PORT).toBe("number");
  });
  it("has LOG_LEVEL", () => {
    expect(envConfig.LOG_LEVEL).toBeDefined();
  });
  it("has NODE_ENV", () => {
    expect(envConfig.NODE_ENV).toBeDefined();
  });
  it("has JWT_SECRET", () => {
    expect(envConfig.JWT_SECRET).toBeDefined();
  });
  it("has DATABASE_URL", () => {
    expect(envConfig.DATABASE_URL).toBeDefined();
  });
  it("has REDIS_URL", () => {
    expect(envConfig.REDIS_URL).toBeDefined();
  });
});
