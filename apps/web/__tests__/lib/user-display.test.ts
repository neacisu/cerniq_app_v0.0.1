import { describe, expect, it } from "vitest";
import { userAvatarInitials } from "../../src/lib/user-display.js";

describe("userAvatarInitials", () => {
  it("returnează inițiale din două cuvinte (name)", () => {
    expect(userAvatarInitials({ name: "Ana Popescu", email: "a@x.com" })).toBe("AP");
  });

  it("folosește email când lipsește name", () => {
    expect(userAvatarInitials({ email: "ion@example.com" })).toBe("IO");
  });

  it("returnează ? pentru user null sau fără identificatori", () => {
    expect(userAvatarInitials(null)).toBe("?");
    expect(userAvatarInitials({})).toBe("?");
  });
});
