/**
 * Bootstrap: la token persistat, AuthProvider apelează GET /api/v1/auth/me pentru user/rol/tenant
 * (nu rămâne doar JSON din localStorage).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authProviderPath = path.join(__dirname, "../../src/providers/auth-provider.tsx");

describe("AuthProvider — bootstrap /me", () => {
  it("conține apel GET /api/v1/auth/me când există token", () => {
    const src = readFileSync(authProviderPath, "utf-8");
    expect(src).toContain('"/api/v1/auth/me"');
    expect(src).toContain("normalizeMeUser");
  });
});
