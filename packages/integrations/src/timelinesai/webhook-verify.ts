/**
 * Verificare HMAC-SHA256 pentru webhook-uri TimelinesAI.
 * Header: `X-Timelines-Signature` — digest hex (vezi docs/api/webhooks.md §4.1).
 */
import { verifyWebhookHmac } from "@cerniq/worker-shared";

/**
 * @param rawBody — corpul brut al request-ului (același buffer folosit la HMAC)
 * @param signatureHeader — valoarea header-ului `X-Timelines-Signature`
 */
export function verifyTimelinesAIWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  return verifyWebhookHmac(rawBody, signatureHeader, secret);
}
