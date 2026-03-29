import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";

export interface ProvenanceContext {
  traceId: string;
  causationKey: string;
  sourceEndpoint: string;
  actorId?: string;
}

/**
 * Extrage contextul de provenance dintr-un request HTTP Fastify.
 *
 * Logică per câmp:
 * - traceId:       din header `traceparent` (W3C Trace Context, format: {ver}-{traceId}-{parentId}-{flags}),
 *                  sau UUID v4 generat local dacă header-ul lipsește/e malformat.
 * - causationKey:  `request.id` — hyperid generat automat de Fastify per request, unic și opac.
 * - sourceEndpoint: `request.routerPath` — pattern URL (e.g., `/silver/companies/:id/enrich`),
 *                  nu URL-ul concret cu parametri (previne cardinality explosion în logs/metrics).
 * - actorId:       user ID din JWT payload decodat de Fastify (câmpuri posibile: id, userId, sub).
 *
 * Compatibilitate backward: toate câmpurile din ProvenanceContext sunt prezente întotdeauna
 * (traceId/causationKey/sourceEndpoint), actorId e opțional (undefined pe rute publice).
 */
export function buildProvenanceContext(request: FastifyRequest): ProvenanceContext {
  const traceparent = request.headers["traceparent"];
  let traceId: string;

  if (typeof traceparent === "string") {
    // W3C Trace Context RFC 7230: "{version}-{traceId}-{parentId}-{traceFlags}"
    // traceId este segmentul 2 — 32 hex chars (128 bits)
    const parts = traceparent.split("-");
    const candidate = parts[1];
    if (
      typeof candidate === "string" &&
      candidate.length === 32 &&
      /^[0-9a-f]{32}$/i.test(candidate)
    ) {
      traceId = candidate;
    } else {
      traceId = randomUUID();
    }
  } else {
    traceId = randomUUID();
  }

  const user = request.user as { id?: string; userId?: string; sub?: string } | null | undefined;
  const actorId = user?.id ?? user?.userId ?? user?.sub ?? undefined;

  return {
    traceId,
    causationKey: request.id,
    sourceEndpoint: request.routeOptions?.url ?? request.url,
    actorId,
  };
}

/**
 * Generează contextul de provenance pentru webhook-uri inbound.
 *
 * Per plan ADR-0063:
 * - traceId generat la ingestie (NU copiat din header client — webhook-urile externe
 *   nu sunt în același W3C trace; ar amesteca trace ID-uri externe cu cele interne).
 * - causationKey = event ID din payloadul extern al provider-ului (deduplicate downstream).
 * - actorId absent: webhook-urile sunt event-driven, nu user-initiated.
 *
 * Convenție pentru causationKey per provider:
 *  - câmp `id` (generic JSON)
 *  - câmp `event_id`
 *  - câmp `message_id`
 *  - fallback: UUID generat
 */
export function buildWebhookProvenanceContext(
  body: unknown,
  source: string,
): Omit<ProvenanceContext, "actorId"> {
  const b = body as Record<string, unknown> | null | undefined;

  const causationKey =
    (typeof b?.id === "string" && b.id.length > 0 ? b.id : undefined) ??
    (typeof b?.event_id === "string" && b.event_id.length > 0 ? b.event_id : undefined) ??
    (typeof b?.message_id === "string" && b.message_id.length > 0 ? b.message_id : undefined) ??
    randomUUID();

  return {
    traceId: randomUUID(),
    causationKey,
    sourceEndpoint: `/webhooks/${source}`,
  };
}
