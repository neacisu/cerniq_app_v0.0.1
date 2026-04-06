/**
 * Politică demo Login: în sursă, defaultValues cu DEMO_* doar în DEV sau VITE_SHOW_DEMO_LOGIN=true.
 * Build producție fără flag → câmpuri goale (fără email demo în bundle ca defaultValues).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("Login.tsx — politică demo prefill", () => {
  it("defaultValues folosesc DEMO_LOGIN_CREDENTIALS doar când DEV sau VITE_SHOW_DEMO_LOGIN", () => {
    const src = readFileSync(path.join(ROOT, "apps/web/src/pages/auth/Login.tsx"), "utf-8");
    expect(src).toContain("import.meta.env.DEV");
    expect(src).toContain("VITE_SHOW_DEMO_LOGIN");
    expect(src).toContain("DEMO_LOGIN_CREDENTIALS");
    expect(src).toContain('import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_LOGIN === "true"');
    expect(src).toContain('{ email: "", password: "" }');
  });
});
