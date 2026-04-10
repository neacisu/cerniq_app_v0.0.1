/**
 * POST /api/v1/webhooks/* — semnătură HMAC (raw body), job BullMQ cu provenance din `buildWebhookProvenanceContext`.
 * Fără JWT; tenant nu este setat la nivel HTTP — rămâne în `body` pentru worker (vezi comentariu în test).
 * Idempotency: în cod nu există deduplicare — fiecare POST valid adaugă job (documentat).
 */
import { createHmac } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

const queueAdd = vi.fn();

vi.mock("../src/lib/queue-factory.js", () => ({
  createQueue: vi.fn(() => ({
    add: (...args: unknown[]) => queueAdd(...args),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { buildApp } from "../src/app.js";

function timelinesSignature(raw: Buffer, secret: string): string {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

function instantlySignature(raw: Buffer, secret: string): string {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

describe("Webhooks — semnătură validă, raw body, provenance (fără tenant HTTP)", () => {
  let app: FastifyInstance;
  const timelinesSecret = "test-timelines-secret-32chars!!";
  const instantlySecret = "test-instantly-secret-32chars!!!";

  beforeAll(async () => {
    process.env.TIMELINESAI_WEBHOOK_SECRET = timelinesSecret;
    process.env.INSTANTLY_WEBHOOK_SECRET = instantlySecret;
    app = await buildApp();
    await app.ready();
  });

  beforeEach(() => {
    queueAdd.mockClear();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.TIMELINESAI_WEBHOOK_SECRET;
    delete process.env.INSTANTLY_WEBHOOK_SECRET;
  });

  it("POST /timelinesai — semnătură invalidă → 401", async () => {
    const payload = { id: "evt-1", hello: "world" };
    const raw = Buffer.from(JSON.stringify(payload), "utf8");
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/timelinesai",
      headers: {
        "content-type": "application/json",
        "x-timelines-signature": "deadbeef",
      },
      payload: raw,
    });
    expect(res.statusCode).toBe(401);
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it("POST /timelinesai — semnătură validă → 200, job cu causationKey din body.id + sourceEndpoint", async () => {
    const payload = {
      id: "causation-timeline-001",
      tenant_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      event: "message.received",
    };
    const raw = Buffer.from(JSON.stringify(payload), "utf8");
    const sig = timelinesSignature(raw, timelinesSecret);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/timelinesai",
      headers: {
        "content-type": "application/json",
        "x-timelines-signature": sig,
      },
      payload: raw,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success?: boolean };
    expect(body.success).toBe(true);
    expect(queueAdd).toHaveBeenCalledTimes(1);
    const call = queueAdd.mock.calls[0] as [string, Record<string, unknown>];
    expect(call[0]).toBe("ingest");
    expect(call[1].source).toBe("timelinesai");
    expect(call[1].causationKey).toBe("causation-timeline-001");
    expect(call[1].sourceEndpoint).toBe("/webhooks/timelinesai");
    expect(typeof call[1].traceId).toBe("string");
    expect(typeof (call[1] as { requestId?: string }).requestId).toBe("string");
    expect(typeof (call[1] as { httpCorrelationId?: string }).httpCorrelationId).toBe("string");
    expect(call[1].body).toMatchObject(payload);
    /** Rezolvare tenant pentru ingest: nu în provenanța HTTP; workerul folosește payload (ex. tenant_id). */
    expect((call[1].body as { tenant_id?: string }).tenant_id).toBe(payload.tenant_id);
  });

  it("POST /instantly — semnătură validă (X-Instantly-Signature) → 200, provenance", async () => {
    const payload = { id: "inst-evt-2", event_id: "ignored-because-id-wins" };
    const raw = Buffer.from(JSON.stringify(payload), "utf8");
    const sig = instantlySignature(raw, instantlySecret);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/instantly",
      headers: {
        "content-type": "application/json",
        "x-instantly-signature": sig,
      },
      payload: raw,
    });
    expect(res.statusCode).toBe(200);
    expect(queueAdd).toHaveBeenCalled();
    const call = queueAdd.mock.calls.at(-1) as [string, Record<string, unknown>] | undefined;
    expect(call?.[1].source).toBe("instantly");
    expect(call?.[1].causationKey).toBe("inst-evt-2");
    expect(call?.[1].sourceEndpoint).toBe("/webhooks/instantly");
  });

  it("document: handler-ele nu deduplică (fără idempotency key) — două POST valide → două add", async () => {
    const payload = { id: "dup-check" };
    const raw = Buffer.from(JSON.stringify(payload), "utf8");
    const sig = timelinesSignature(raw, timelinesSecret);
    for (let i = 0; i < 2; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/webhooks/timelinesai",
        headers: {
          "content-type": "application/json",
          "x-timelines-signature": sig,
        },
        payload: raw,
      });
      expect(res.statusCode).toBe(200);
    }
    const timelineAdds = queueAdd.mock.calls.filter(
      (c) => (c[1] as { source?: string }).source === "timelinesai",
    );
    expect(timelineAdds.length).toBeGreaterThanOrEqual(2);
  });
});
