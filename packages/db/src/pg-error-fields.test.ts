import { describe, it, expect } from "vitest";
import { getPostgresErrorFields } from "./pg-error-fields.js";

describe("getPostgresErrorFields", () => {
  it("citește code/message de pe obiectul principal", () => {
    expect(getPostgresErrorFields({ code: "42P01", message: "missing" })).toEqual({
      code: "42P01",
      message: "missing",
    });
  });

  it("preferă cause când e prezent", () => {
    expect(
      getPostgresErrorFields({
        cause: { code: "42710", message: "dup" },
      }),
    ).toEqual({ code: "42710", message: "dup" });
  });

  it("returnează stringuri goale pentru valori non-obiect", () => {
    expect(getPostgresErrorFields(null)).toEqual({ code: "", message: "" });
  });
});
