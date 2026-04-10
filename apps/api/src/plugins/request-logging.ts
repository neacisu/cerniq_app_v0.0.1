import type { FastifyPluginCallback, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { randomUUID, createHash } from "node:crypto";

const MAX_ACCESS_LOG_BODY_BYTES = 48_000;

function hashBodyForLog(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  try {
    const s = typeof body === "string" ? body : JSON.stringify(body);
    if (Buffer.byteLength(s, "utf8") > MAX_ACCESS_LOG_BODY_BYTES) return undefined;
    return createHash("sha256").update(s, "utf8").digest("hex").slice(0, 32);
  } catch {
    return undefined;
  }
}
import { isSpanContextValid, trace } from "@opentelemetry/api";
import { enterCorrelationContext } from "@cerniq/observability";
import { httpRouteLabel } from "./metrics.js";

function clientIpHash(request: FastifyRequest): string {
  const raw = request.ip ?? "";
  if (!raw) return "";
  return createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 16);
}

function requestUserId(request: FastifyRequest): string | null {
  const u = request.user as { sub?: string; userId?: string; id?: string } | undefined;
  if (!u) return null;
  if (typeof u.userId === "string") return u.userId;
  if (typeof u.sub === "string") return u.sub;
  if (typeof u.id === "string") return u.id;
  return null;
}

const requestLoggingFn: FastifyPluginCallback = (app, _opts, done) => {
  app.addHook("onRequest", (request, reply, hookDone) => {
    request.headers["x-request-id"] ??= randomUUID();
    request.headers["x-correlation-id"] ??= randomUUID();
    const correlationId = String(request.headers["x-correlation-id"]);
    reply.header("x-correlation-id", correlationId);
    const spanCtx = trace.getActiveSpan()?.spanContext();
    const uid = requestUserId(request);
    enterCorrelationContext({
      correlationId,
      requestId: String(request.headers["x-request-id"]),
      ...(typeof request.tenantId === "string" && request.tenantId.length > 0
        ? { tenantId: request.tenantId }
        : {}),
      ...(uid ? { userId: uid } : {}),
      ...(spanCtx && isSpanContextValid(spanCtx) ? { traceId: spanCtx.traceId } : {}),
    });
    trace.getActiveSpan()?.setAttribute("cerniq.correlation_id", correlationId);
    hookDone();
  });

  app.addHook("onResponse", (request, reply, hookDone) => {
    const active = trace.getActiveSpan();
    const spanCtx = active?.spanContext();
    request.log.info({
      msg: "request completed",
      requestId: request.headers["x-request-id"],
      correlationId: request.headers["x-correlation-id"],
      traceId: spanCtx?.traceId,
      spanId: spanCtx?.spanId,
      trace_id: spanCtx?.traceId,
      span_id: spanCtx?.spanId,
      tenantId: request.tenantId ?? null,
      userId: requestUserId(request),
      method: request.method,
      httpRoute: httpRouteLabel(request),
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime,
      clientIpHash: clientIpHash(request),
      requestBodyHash: hashBodyForLog(request.body),
    });
    hookDone();
  });

  done();
};

export const requestLoggingPlugin = fp(requestLoggingFn, {
  name: "request-logging",
});
