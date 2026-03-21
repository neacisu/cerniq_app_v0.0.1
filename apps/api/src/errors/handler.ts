import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./app-error.js";
import { envConfig } from "../config.js";

// @fastify/jwt emits 400 (not 401) for missing/malformed Authorization headers:
// FST_JWT_BAD_REQUEST    — header present but malformed (e.g. not "Bearer <token>")
// FST_JWT_BAD_COOKIE_REQUEST — cookie present but malformed
// RFC 7235 mandates 401 for missing/invalid credentials.
// Without this normalisation, the frontend's 401-triggered refresh/redirect flow never fires.
const JWT_BAD_CREDENTIALS_CODES = new Set(["FST_JWT_BAD_REQUEST", "FST_JWT_BAD_COOKIE_REQUEST"]);

// PostgreSQL error codes that indicate a transient infrastructure problem, not a code bug.
// These should return 503 Service Unavailable so clients know to retry.
const PG_INFRA_ERROR_CODES = new Set([
  "08006", // connection failure
  "08001", // unable to establish connection
  "08004", // rejected connection
  "08P01", // protocol violation (pooler misconfiguration)
  "57P01", // admin shutdown
  "57P02", // crash shutdown
  "53300", // too many connections
  "53200", // out of memory
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
]);

function getPgCode(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const e = err as Record<string, unknown>;
  if (typeof e.code === "string") return e.code;
  if (e.cause && typeof e.cause === "object") {
    const c = e.cause as Record<string, unknown>;
    if (typeof c.code === "string") return c.code;
  }
  return "";
}

function isDbUnavailableError(err: unknown): boolean {
  const code = getPgCode(err);
  if (PG_INFRA_ERROR_CODES.has(code)) return true;
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return (
    msg.includes("connection refused") ||
    msg.includes("econnrefused") ||
    msg.includes("connection terminated") ||
    msg.includes("server closed the connection") ||
    msg.includes("max retries per request") || // ioredis MaxRetriesPerRequestError
    msg.includes("connection is closed") // ioredis closed connection
  );
}

function isMigrationMissingError(err: unknown): boolean {
  return getPgCode(err) === "42P01";
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.message,
      details: {
        statusCode: error.statusCode,
        code: error.code,
      },
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: "Validation failed",
      details: {
        statusCode: 400,
        code: "ZOD_ERROR",
        issues: error.issues,
      },
    });
  }

  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: "Validation failed",
      details: {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        validation: error.validation,
      },
    });
  }

  if (JWT_BAD_CREDENTIALS_CODES.has(error.code ?? "")) {
    return reply.status(401).send({
      success: false,
      error: "Unauthorized",
      details: {
        statusCode: 401,
        code: "UNAUTHORIZED",
      },
    });
  }

  if (isDbUnavailableError(error)) {
    return reply.status(503).send({
      success: false,
      error: "Service temporarily unavailable. Database unreachable.",
      details: { statusCode: 503, code: "DB_UNAVAILABLE" },
    });
  }

  if (isMigrationMissingError(error)) {
    return reply.status(503).send({
      success: false,
      error: "Service temporarily unavailable. Database migrations pending.",
      details: { statusCode: 503, code: "DB_MIGRATION_PENDING" },
    });
  }

  const statusCode = error.statusCode ?? 500;
  return reply.status(statusCode).send({
    success: false,
    error: envConfig.NODE_ENV === "production" ? "Internal Server Error" : error.message,
    details: {
      statusCode,
      code: error.code ?? "INTERNAL_ERROR",
    },
  });
}
