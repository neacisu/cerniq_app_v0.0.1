/**
 * Verificare HMAC-SHA256 hex pentru webhook-uri (corp brut + secret partajat).
 * Folosit la antetul `X-Signature` (valoare hex, opțional prefix `sha256=`).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function normalizeSignatureHeader(value: string): string {
  const v = value.trim();
  return v.replace(/^sha256=/i, "").trim();
}

/**
 * @param payload — același octet string ca la semnare (Buffer sau UTF-8)
 * @param signatureHeader — valoarea antetului `X-Signature` (hex)
 * @param secret — secret partajat (ex. din OpenBao → env)
 */
export function verifyWebhookHmac(
  payload: string | Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader?.trim() || !secret?.trim()) {
    return false;
  }
  const raw = typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
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
