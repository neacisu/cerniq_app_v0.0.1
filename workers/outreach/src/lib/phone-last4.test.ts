import { describe, expect, it } from "vitest";
import { phoneLast4 } from "./phone-last4.js";

describe("phoneLast4", () => {
  it("returnează gol pentru string gol", () => {
    expect(phoneLast4("")).toBe("");
  });

  it("returnează tot dacă ≤4 cifre", () => {
    expect(phoneLast4("12")).toBe("12");
    expect(phoneLast4("+40 721")).toBe("0721");
  });

  it("extrage ultimele 4 cifre din E164", () => {
    expect(phoneLast4("+40722123456")).toBe("3456");
  });
});
