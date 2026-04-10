/**
 * Chei sensibile pentru reload OpenBao → workers (SENSITIVE_KEYS în secrets.ts).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const SECRETS_TS = path.join(ROOT, "workers", "shared", "src", "secrets.ts");

describe("workers/shared secrets — SENSITIVE_KEYS", () => {
  it("include chei outreach / provider Etapa 2 din plan", () => {
    const s = readFileSync(SECRETS_TS, "utf8");
    for (const key of [
      "ANTHROPIC_API_KEY",
      "TIMELINESAI_API_KEY",
      "INSTANTLY_API_KEY",
      "RESEND_API_KEY",
    ]) {
      expect(s).toContain(`"${key}"`);
    }
  });
});
