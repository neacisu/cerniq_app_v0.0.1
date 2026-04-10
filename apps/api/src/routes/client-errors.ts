/**
 * Raportare erori din browser → `observability.error_log` (fără JWT obligatoriu).
 * Prefix înregistrat: POST /api/v1/errors/client
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { enrichError } from "@cerniq/observability";
import { insertErrorLogRows } from "@cerniq/db";
import { parseOptionalUuid } from "../errors/error-log-persist.js";
import { clientErrorsFrontendIngestTotal } from "../plugins/metrics.js";

/** Anti-flood: aceeași cheie + IP în fereastra TTL → 202 fără INSERT repetat. */
const CLIENT_ERROR_IDEM_TTL_MS = 10 * 60 * 1000;
const clientErrorIdemHits = new Map<string, number>();

function pruneClientErrorIdem(now: number): void {
  if (clientErrorIdemHits.size < 8000) return;
  for (const [k, t] of clientErrorIdemHits) {
    if (now - t > CLIENT_ERROR_IDEM_TTL_MS) clientErrorIdemHits.delete(k);
  }
}

/** @returns true dacă același IP+cheie a avut deja INSERT reușit în TTL. */
function isClientErrorIdemReplay(ip: string, rawKey: string | undefined): boolean {
  if (rawKey == null) return false;
  const key = rawKey.trim();
  if (key.length < 8 || key.length > 256) return false;
  const now = Date.now();
  pruneClientErrorIdem(now);
  const composite = `${ip}:${key}`;
  const prev = clientErrorIdemHits.get(composite);
  return prev !== undefined && now - prev < CLIENT_ERROR_IDEM_TTL_MS;
}

function recordClientErrorIdemSuccess(ip: string, rawKey: string | undefined): void {
  if (rawKey == null) return;
  const key = rawKey.trim();
  if (key.length < 8 || key.length > 256) return;
  const now = Date.now();
  pruneClientErrorIdem(now);
  clientErrorIdemHits.set(`${ip}:${key}`, now);
}

const clientErrorBodySchema = z.object({
  message: z.string().min(1).max(4000),
  name: z.string().max(256).optional(),
  stack: z.string().max(12000).optional(),
  /** componentStack React / sursă UI */
  source: z.string().max(8000).optional(),
  url: z.string().max(4000).optional(),
  userAgent: z.string().max(512).optional(),
  clientTimestamp: z.string().max(64).optional(),
});

export async function clientErrorsRoutes(app: FastifyInstance) {
  const clientErrorsLimiter = app.rateLimit({
    max: 10,
    timeWindow: "1 minute",
    keyGenerator: (req) => `client-errors:${req.ip}`,
  });

  app.post(
    "/errors/client",
    {
      onRequest: [clientErrorsLimiter],
      schema: {
        description: "Acceptă raport de eroare din frontend (public, rate-limit IP).",
        tags: ["observability"],
        body: clientErrorBodySchema,
        response: {
          202: z.object({
            success: z.literal(true),
            data: z.object({ accepted: z.literal(true) }),
          }),
          400: z.looseObject({ success: z.literal(false), error: z.string() }),
          429: z.looseObject({ success: z.literal(false), error: z.string() }),
          503: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const parsed = clientErrorBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "Invalid body",
          details: { issues: parsed.error.issues },
        });
      }
      const body = parsed.data;

      const idemHeaderRaw = request.headers["idempotency-key"];
      const idemHeader = Array.isArray(idemHeaderRaw) ? idemHeaderRaw[0] : idemHeaderRaw;
      if (
        isClientErrorIdemReplay(request.ip, typeof idemHeader === "string" ? idemHeader : undefined)
      ) {
        clientErrorsFrontendIngestTotal.inc({ outcome: "idempotent_replay" });
        return reply.code(202).send({ success: true, data: { accepted: true } });
      }

      const synthetic = new Error(body.message.slice(0, 4000));
      if (body.name) synthetic.name = body.name.slice(0, 256);
      if (body.stack) synthetic.stack = body.stack.slice(0, 12000);

      const enriched = enrichError(synthetic, {
        clientReport: true,
        url: body.url,
      });

      const correlationRaw = request.headers["x-correlation-id"];
      const correlationStr = Array.isArray(correlationRaw) ? correlationRaw[0] : correlationRaw;
      const sessionCorrelationRaw = typeof correlationStr === "string" ? correlationStr.trim() : "";
      const correlationUuid = parseOptionalUuid(sessionCorrelationRaw);

      const tenantFromJwt = parseOptionalUuid(request.tenantId ?? undefined);

      try {
        await insertErrorLogRows([
          {
            tenantId: tenantFromJwt ?? null,
            fingerprint: enriched.fingerprint,
            message: enriched.enrichedMessage.slice(0, 4000),
            errorType: enriched.errorType,
            context: {
              sourceType: "frontend",
              clientUrl: body.url?.slice(0, 2000),
              userAgent: body.userAgent?.slice(0, 512),
              clientTimestamp: body.clientTimestamp,
              sessionCorrelationId: sessionCorrelationRaw || undefined,
              componentSource: body.source?.slice(0, 4000),
              causeChain: enriched.causeChain,
            },
            correlationId: correlationUuid ?? null,
          },
        ]);
      } catch (err) {
        request.log.error({ err }, "client-errors: insertErrorLogRows failed");
        return reply.code(503).send({
          success: false,
          error: "Service temporarily unavailable",
        });
      }

      recordClientErrorIdemSuccess(
        request.ip,
        typeof idemHeader === "string" ? idemHeader : undefined,
      );

      clientErrorsFrontendIngestTotal.inc({ outcome: "inserted" });
      return reply.code(202).send({ success: true, data: { accepted: true } });
    },
  );
}
