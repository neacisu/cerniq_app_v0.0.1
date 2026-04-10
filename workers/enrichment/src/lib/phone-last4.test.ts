import { describe, it, expect } from "vitest";
import { phoneLast4 } from "./phone-last4.js";

describe("phoneLast4", () => {
  it("returnează toate cifrele dacă sunt ≤4", () => {
    expect(phoneLast4("12")).toBe("12");
    expect(phoneLast4("+40 72x")).toBe("4072");
  });

  it("returnează ultimele 4 cifre din număr normalizat", () => {
    expect(phoneLast4("+40722111222")).toBe("1222");
  });
});
