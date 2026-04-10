import { describe, it, expect } from "vitest";
import { StructuredLogSchema } from "@cerniq/shared-types";

/**
 * Audit F5 structured-logs (plan: consumatori vs evenimente noi):
 * - `StructuredLogSchema` e folosit în `@cerniq/observability` (re-export + extend minor).
 * - Logurile Fastify (`request.log.*`) din F5 (auth, outreach, webhooks, dashboard) nu sunt
 *   serializate obligatoriu prin acest schema la sursă — rămân compatibile Pino.
 * Schimbare de schemă: nu e necesară pentru livrarea F5; evită drift fals față de pipeline.
 */
describe("F5: StructuredLogSchema (scope față de loguri API noi)", () => {
  it("parsează payload minimal de serviciu", () => {
    const r = StructuredLogSchema.safeParse({
      level: "info",
      time: Date.now(),
      msg: "ok",
      service: "api",
    });
    expect(r.success).toBe(true);
  });
});
