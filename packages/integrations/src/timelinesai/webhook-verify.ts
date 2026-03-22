/**
 * Verificare HMAC-SHA256 pentru webhook-uri TimelinesAI.
 * Header: `X-Timelines-Signature` — digest hex (vezi docs/api/webhooks.md §4.1).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function normalizeSignatureHeader(value: string): string {
  const v = value.trim();
  return v.replace(/^sha256=/i, "").trim();
}

/**
 * @param rawBody — corpul brut al request-ului (același buffer folosit la HMAC)
 * @param signatureHeader — valoarea header-ului `X-Timelines-Signature`
 */
export function verifyTimelinesAIWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader?.trim() || !secret?.trim()) {
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
