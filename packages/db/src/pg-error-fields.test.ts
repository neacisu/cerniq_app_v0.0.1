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

  it("coercă code și message non-string la string", () => {
    expect(getPostgresErrorFields({ code: 42, message: true })).toEqual({
      code: "42",
      message: "true",
    });
  });

  it("ignoră cause care nu este obiect (folosește câmpurile de pe eroare)", () => {
    expect(getPostgresErrorFields({ code: "40", message: "m", cause: "not-object" })).toEqual({
      code: "40",
      message: "m",
    });
  });

  it("citește code/message de pe cause când sunt definite acolo", () => {
    expect(
      getPostgresErrorFields({
        cause: { code: "22", message: "from-cause" },
        code: "ignored",
        message: "ignored",
      }),
    ).toEqual({ code: "22", message: "from-cause" });
  });

  it("cause obiect gol: cade pe câmpurile părinte sau stringuri goale", () => {
    expect(getPostgresErrorFields({ cause: {}, code: "P1", message: "parent" })).toEqual({
      code: "P1",
      message: "parent",
    });
  });

  it("fără code pe obiect: String(undefined) devine string gol", () => {
    expect(getPostgresErrorFields({ message: "only-msg" })).toEqual({
      code: "",
      message: "only-msg",
    });
  });

  it('code și message explicite undefined pe obiect: coercție prin String(… ?? "")', () => {
    expect(
      getPostgresErrorFields({ code: undefined, message: undefined } as {
        code?: string;
        message?: string;
      }),
    ).toEqual({ code: "", message: "" });
  });
});
