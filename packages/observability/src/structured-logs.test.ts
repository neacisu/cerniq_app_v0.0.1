import { describe, it, expect } from "vitest";
import { StructuredLogSchema } from "./structured-logs.js";

describe("structured-logs", () => {
  it("parsează payload minimal din shared-types", () => {
    const r = StructuredLogSchema.safeParse({
      level: "info",
      time: 1,
      msg: "x",
      service: "api",
    });
    expect(r.success).toBe(true);
  });

  it("acceptă errorType opțional", () => {
    const r = StructuredLogSchema.safeParse({
      level: "error",
      time: 2,
      msg: "e",
      service: "w",
      errorType: "permanent",
      errorClassification: "infra",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.errorType).toBe("permanent");
      expect(r.data.errorClassification).toBe("infra");
    }
  });

  it("respinge level invalid", () => {
    const r = StructuredLogSchema.safeParse({
      level: "nope",
      time: 1,
      msg: "x",
      service: "s",
    });
    expect(r.success).toBe(false);
  });
});
