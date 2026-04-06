import { describe, it, expect } from "vitest";
import { refineAuthenticatedFromAuth } from "@/lib/refine-auth.js";

describe("refineAuthenticatedFromAuth", () => {
  it("loading=true → autentificat (bootstrap /me, ca ProtectedRoute)", () => {
    expect(refineAuthenticatedFromAuth({ user: null, loading: true })).toBe(true);
  });

  it("loading=false + user → autentificat", () => {
    expect(refineAuthenticatedFromAuth({ user: { id: "1" }, loading: false })).toBe(true);
  });

  it("loading=false + fără user → neautentificat", () => {
    expect(refineAuthenticatedFromAuth({ user: null, loading: false })).toBe(false);
  });
});
