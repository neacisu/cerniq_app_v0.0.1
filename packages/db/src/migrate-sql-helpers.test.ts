import { describe, it, expect } from "vitest";
import { ADD_CONSTRAINT_PATTERN, extractAddConstraintName } from "./migrate-sql-helpers.js";

describe("extractAddConstraintName", () => {
  it("extrage numele din ADD CONSTRAINT cu ghilimele duble", () => {
    expect(extractAddConstraintName('ALTER TABLE foo ADD CONSTRAINT "uq_x" UNIQUE (a);')).toBe(
      "uq_x",
    );
  });

  it("returnează null dacă nu există ADD CONSTRAINT", () => {
    expect(extractAddConstraintName("SELECT 1")).toBeNull();
  });

  it("pattern-ul folosește RegExp.exec (compatibil Sonar)", () => {
    expect(ADD_CONSTRAINT_PATTERN.exec('ADD CONSTRAINT "c1"')?.[1]).toBe("c1");
  });
});
