import { createHmac, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookHmac } from "./webhook-hmac.js";

describe("verifyWebhookHmac", () => {
  /**
   * Material de cheie HMAC generat la runtime — nu reprezintă un secret de producție
   * și evită literalii tip „parolă” marcați de Sonar (typescript:S6437).
   */
  const hmacKeyMaterial = randomBytes(32).toString("base64url");
  const body = Buffer.from('{"hello":"world"}', "utf8");
  const good = createHmac("sha256", hmacKeyMaterial).update(body).digest("hex");

  it("acceptă semnătură hex corectă", () => {
    expect(verifyWebhookHmac(body, good, hmacKeyMaterial)).toBe(true);
  });

  it("acceptă prefix sha256=", () => {
    expect(verifyWebhookHmac(body, `sha256=${good}`, hmacKeyMaterial)).toBe(true);
  });

  it("respinge semnătură greșită", () => {
    expect(verifyWebhookHmac(body, "00".repeat(32), hmacKeyMaterial)).toBe(false);
  });

  it("respinge header lipsă sau secret gol", () => {
    expect(verifyWebhookHmac(body, undefined, hmacKeyMaterial)).toBe(false);
    expect(verifyWebhookHmac(body, good, "")).toBe(false);
  });

  it("respinge hex invalid", () => {
    expect(verifyWebhookHmac(body, "not-hex", hmacKeyMaterial)).toBe(false);
  });
});
