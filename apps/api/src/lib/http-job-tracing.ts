import { createHash, randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { buildProvenanceContext, type ProvenanceContext } from "./provenance.js";

/** Aliniat la hash-ul din audit-trail (PII-safe). */
export function hashClientIp(request: FastifyRequest): string {
  const raw = request.ip ?? "";
  if (!raw) return "";
  return createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 16);
}

/**
 * Primul token non-gol din `x-correlation-id` (string sau array).
 * Aliniat la comportamentul proxy-urilor care trimit duplicate sau primul slot gol.
 */
export function getFirstNonEmptyCorrelationIdHeader(request: FastifyRequest): string | undefined {
  const raw = request.headers["x-correlation-id"];
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  if (Array.isArray(raw)) {
    for (const v of raw) {
      if (typeof v === "string" && v.trim().length > 0) return v.trim();
    }
  }
  return undefined;
}

export type HttpJobTracingFields = {
  requestId: string;
  httpCorrelationId: string;
  sourceEndpoint: string;
  actorId?: string;
};

/**
 * Câmpuri explicite pentru job payloads (API → worker), fără a înlocui `correlationId` semantic din pipeline-ul de import.
 * `requestId` = Fastify request id; `causationKey` din buildProvenanceContext rămâne același identificator pentru compatibilitate.
 */
export function buildHttpJobTracingFields(
  request: FastifyRequest,
  randomUuid: () => string = randomUUID,
): HttpJobTracingFields {
  const user = request.user as { id?: string; userId?: string; sub?: string } | null | undefined;
  const actorId = user?.id ?? user?.userId ?? user?.sub ?? undefined;
  return {
    requestId: request.id,
    httpCorrelationId: getFirstNonEmptyCorrelationIdHeader(request) ?? randomUuid(),
    sourceEndpoint: request.routeOptions?.url ?? request.url,
    ...(actorId === undefined ? {} : { actorId }),
  };
}

/** Spread în `queue.add` / `enqueueImportJob` payload: provenance + tracing HTTP explicit. */
export function buildApiJobPayloadContext(
  request: FastifyRequest,
): ProvenanceContext & HttpJobTracingFields {
  return {
    ...buildProvenanceContext(request),
    ...buildHttpJobTracingFields(request),
  };
}
