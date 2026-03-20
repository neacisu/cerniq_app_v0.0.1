/**
 * Verificare HMAC-SHA256 pentru webhook-uri Instantly (pattern generic din docs/api/webhooks.md).
 * Acceptă header-e comune: `X-Instantly-Signature`, `X-Signature`, `X-Webhook-Signature`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const HEADER_CANDIDATES = [
  "x-instantly-signature",
  "x-signature",
  "x-webhook-signature",
  "x-hub-signature-256",
] as const;

function normalizeSignatureHeader(value: string): string {
  const v = value.trim();
  if (v.startsWith("sha256=")) {
    return v.slice(7).trim();
  }
  return v;
}

function pickSignature(headers: Record<string, string | string[] | undefined>): string | undefined {
  for (const key of HEADER_CANDIDATES) {
    const raw = headers[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw;
    }
    if (Array.isArray(raw) && raw[0]?.trim()) {
      return raw[0];
    }
  }
  return undefined;
}

/**
 * @param rawBody — corpul brut al request-ului
 * @param headers — `req.headers` (lowercase keys recomandate)
 */
export function verifyInstantlyWebhookSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  if (!secret?.trim()) {
    return false;
  }
  const signatureHeader = pickSignature(headers);
  if (!signatureHeader?.trim()) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = normalizeSignatureHeader(signatureHeader);
  try {
    const a = Buffer.from(received, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
