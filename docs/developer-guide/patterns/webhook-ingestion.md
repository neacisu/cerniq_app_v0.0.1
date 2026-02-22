# Webhook Ingestion Pattern

**Priority:** BLOCKER | **Version:** 1.0 | **February 2026**

## Overview

This pattern defines how Cerniq receives and processes webhooks from payment providers (Stripe, MobilPay), SMS gateways, and other external systems. Security, idempotency, and async processing are mandatory.

---

## 1. Signature Verification (HMAC-SHA256)

Always verify webhook signatures before processing. Never trust raw payloads.

```typescript
import crypto from "crypto";

function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm = "sha256",
): boolean {
  const expected = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace("sha256=", ""), "hex"),
    Buffer.from(expected, "hex"),
  );
}

// Usage in route handler
const rawBody = req.rawBody; // Must use raw body, not parsed JSON
const sig = req.headers["x-webhook-signature"] ?? "";
if (!verifyWebhookSignature(rawBody, sig, WEBHOOK_SECRET)) {
  throw new UnauthorizedError("Invalid webhook signature");
}
```

**Important:** Configure Fastify to preserve `rawBody` for webhook routes (do not parse JSON before verification).

---

## 2. Idempotency Keys

Use `X-Idempotency-Key` or provider-specific idempotency headers to prevent duplicate processing.

```typescript
const idempotencyKey =
  req.headers["x-idempotency-key"] ?? req.headers["stripe-idempotency-key"];
if (!idempotencyKey) throw new BadRequestError("Idempotency-Key required");

const existing = await redis.get(
  `cerniq:webhook:idempotency:${idempotencyKey}`,
);
if (existing) {
  return reply.status(200).send(JSON.parse(existing)); // Return cached response
}
```

Store idempotency result in Redis with 24h TTL. Key format: `cerniq:webhook:idempotency:{key}`.

---

## 3. Async Processing via BullMQ

Never perform heavy processing in the webhook handler. Enqueue immediately and return 200.

```typescript
await webhookQueue.add(
  "process-payment",
  { payload: body, provider: "stripe", eventId: body.id },
  {
    jobId: idempotencyKey,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
);

return reply.status(200).send({ received: true });
```

Queue naming: `cerniq:queue:webhook:payments`, `cerniq:queue:webhook:sms`, etc.

---

## 4. Dead Letter Queue (DLQ)

Failed jobs after max retries go to DLQ for manual inspection and replay.

```typescript
worker.on("failed", async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    await dlqQueue.add("webhook-failed", {
      jobId: job.id,
      payload: job.data,
      error: err.message,
    });
  }
});
```

DLQ: `cerniq:queue:webhook:dlq`. Monitor via Bull Board or custom dashboard.

---

## 5. Replay Mechanism

Support replay of failed webhooks from DLQ:

```typescript
// Replay single job
await webhookQueue.add("process-payment", originalPayload, { jobId: newId });

// Mark as replayed in DLQ
await dlqJob.remove();
```

Expose replay via admin API (authenticated) or runbook script.

---

## 6. Structured Logging

Log all webhook receipts with correlation IDs:

```typescript
logger.info(
  {
    event: "webhook.received",
    provider: "stripe",
    eventId: body.id,
    idempotencyKey,
    type: body.type,
  },
  "Webhook received",
);
```

Never log full payload (may contain PII). Log event type and IDs only.

---

## 7. Provider-Specific Headers

| Provider | Signature Header   | Secret Source            |
| -------- | ------------------ | ------------------------ |
| Stripe   | `stripe-signature` | OpenBao webhook secret   |
| Resend   | `svix-signature`   | Resend dashboard         |
| MobilPay | `X-Signature`      | MobilPay merchant config |

Always verify using provider docs. Some use timestamp + payload (replay protection).

---

## 8. Related Documents

- `worker-pool-sizing.md` — Webhook queue concurrency
- `redis-db-separation.md` — Idempotency key storage
- `email-integration.md` — Resend webhooks

---

## Checklist

- [ ] HMAC-SHA256 signature verification
- [ ] Raw body preserved for verification
- [ ] Idempotency key required and enforced
- [ ] Async processing via BullMQ
- [ ] DLQ for failed jobs
- [ ] Replay mechanism documented
- [ ] Structured logging (no PII)
