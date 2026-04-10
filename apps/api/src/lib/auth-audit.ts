import { createHash } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { auditWriter } from "@cerniq/observability";
import { httpRouteLabel } from "../plugins/metrics.js";
import { getFirstNonEmptyCorrelationIdHeader, hashClientIp } from "./http-job-tracing.js";

const CORRELATION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseOptionalUuidCorrelation(request: FastifyRequest): string | null {
  const s = getFirstNonEmptyCorrelationIdHeader(request);
  if (!s) return null;
  return CORRELATION_UUID_RE.test(s) ? s : null;
}

function authHeaderCorrelationMeta(request: FastifyRequest): Record<string, unknown> {
  const val = getFirstNonEmptyCorrelationIdHeader(request);
  if (val !== undefined && val.length > 0) {
    return { httpCorrelationIdRaw: val.slice(0, 128) };
  }
  return {};
}

function userAgent(request: FastifyRequest): string | null {
  const v = request.headers["user-agent"];
  return typeof v === "string" ? v : null;
}

/**
 * F5.1 scope: audit explicit pe POST /login, /register, /logout, /refresh (succes).
 * Eșecuri token (refresh) și conflicte / validare register: aceleași primitive PII-safe.
 * GET /me: fără audit mutating dedicat (citire; pluginul generic nu auditează GET pe auth ca mutating).
 */
export function hashEmailForAuthLog(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim(), "utf8").digest("hex").slice(0, 16);
}

export function writeAuthAuditEvent(
  request: FastifyRequest,
  input: {
    action: "login" | "register" | "logout" | "refresh";
    statusCode: number;
    tenantId?: string | null;
    userId?: string | null;
  },
): void {
  auditWriter.write({
    method: request.method.toUpperCase(),
    routePattern: httpRouteLabel(request),
    statusCode: input.statusCode,
    tenantId: input.tenantId ?? null,
    userId: input.userId ?? null,
    correlationId: parseOptionalUuidCorrelation(request),
    ipHash: hashClientIp(request) || null,
    userAgent: userAgent(request),
    action: input.action,
    resource: "user",
    metadata: {
      ...authHeaderCorrelationMeta(request),
    },
  });
}

export function writeAuthCsrfDeniedAudit(request: FastifyRequest): void {
  auditWriter.write({
    method: request.method.toUpperCase(),
    routePattern: httpRouteLabel(request),
    statusCode: 403,
    tenantId: null,
    userId: null,
    correlationId: parseOptionalUuidCorrelation(request),
    ipHash: hashClientIp(request) || null,
    userAgent: userAgent(request),
    action: "csrf_validation_failed",
    resource: "auth",
    metadata: {
      ...authHeaderCorrelationMeta(request),
    },
  });
}

export function logAndAuditLoginFailure(
  request: FastifyRequest,
  args: {
    email: string | undefined;
    reason: "validation_error" | "invalid_credentials" | "account_inactive" | "db_unavailable";
    statusCode: number;
  },
): void {
  const emailHash = args.email ? hashEmailForAuthLog(args.email) : undefined;
  request.log.warn(
    {
      authEvent: "login_failed",
      emailHash: emailHash ?? null,
      reason: args.reason,
      ipHash: hashClientIp(request) || null,
      route: httpRouteLabel(request),
    },
    "login failed",
  );
  auditWriter.write({
    method: "POST",
    routePattern: httpRouteLabel(request),
    statusCode: args.statusCode,
    tenantId: null,
    userId: null,
    correlationId: parseOptionalUuidCorrelation(request),
    ipHash: hashClientIp(request) || null,
    userAgent: userAgent(request),
    action: "login_failed",
    resource: "user",
    metadata: {
      reason: args.reason,
      ...(emailHash ? { emailHash } : {}),
      ...authHeaderCorrelationMeta(request),
    },
  });
}

/** Eșec refresh: fără token, JWT sau stare sesiune în clar — doar cod discret pentru SIEM. */
export type AuthRefreshFailureReason =
  | "validation_error"
  | "missing_refresh_token"
  | "invalid_jwt"
  | "invalid_refresh_payload"
  | "refresh_family_revoked"
  | "refresh_token_hash_mismatch"
  | "refresh_token_reuse"
  | "user_inactive_or_missing"
  | "db_unavailable";

export function logAndAuditRefreshFailure(
  request: FastifyRequest,
  args: { reason: AuthRefreshFailureReason; statusCode: number },
): void {
  request.log.warn(
    {
      authEvent: "refresh_failed",
      reason: args.reason,
      ipHash: hashClientIp(request) || null,
      route: httpRouteLabel(request),
    },
    "refresh failed",
  );
  auditWriter.write({
    method: "POST",
    routePattern: httpRouteLabel(request),
    statusCode: args.statusCode,
    tenantId: null,
    userId: null,
    correlationId: parseOptionalUuidCorrelation(request),
    ipHash: hashClientIp(request) || null,
    userAgent: userAgent(request),
    action: "refresh_failed",
    resource: "auth",
    metadata: {
      reason: args.reason,
      ...authHeaderCorrelationMeta(request),
    },
  });
}

export type AuthRegisterFailureReason =
  | "validation_error"
  | "email_already_registered"
  | "db_unavailable"
  | "register_db_error";

export function logAndAuditRegisterFailure(
  request: FastifyRequest,
  args: {
    reason: AuthRegisterFailureReason;
    statusCode: number;
    /** Doar pentru fluxuri unde email-ul e deja normalizat / intenționat cunoscut (ex. conflict 409). */
    email?: string;
  },
): void {
  const emailHash = args.email ? hashEmailForAuthLog(args.email) : undefined;
  request.log.warn(
    {
      authEvent: "register_failed",
      reason: args.reason,
      emailHash: emailHash ?? null,
      ipHash: hashClientIp(request) || null,
      route: httpRouteLabel(request),
    },
    "register failed",
  );
  auditWriter.write({
    method: "POST",
    routePattern: httpRouteLabel(request),
    statusCode: args.statusCode,
    tenantId: null,
    userId: null,
    correlationId: parseOptionalUuidCorrelation(request),
    ipHash: hashClientIp(request) || null,
    userAgent: userAgent(request),
    action: "register_failed",
    resource: "user",
    metadata: {
      reason: args.reason,
      ...(emailHash ? { emailHash } : {}),
      ...authHeaderCorrelationMeta(request),
    },
  });
}

export function logAndAuditLogoutValidationFailure(request: FastifyRequest): void {
  request.log.warn(
    {
      authEvent: "logout_failed",
      reason: "validation_error",
      ipHash: hashClientIp(request) || null,
      route: httpRouteLabel(request),
    },
    "logout validation failed",
  );
  auditWriter.write({
    method: "POST",
    routePattern: httpRouteLabel(request),
    statusCode: 400,
    tenantId: null,
    userId: null,
    correlationId: parseOptionalUuidCorrelation(request),
    ipHash: hashClientIp(request) || null,
    userAgent: userAgent(request),
    action: "logout_failed",
    resource: "auth",
    metadata: {
      reason: "validation_error",
      ...authHeaderCorrelationMeta(request),
    },
  });
}
