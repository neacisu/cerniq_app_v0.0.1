import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./app-error.js";
import { envConfig } from "../config.js";

// @fastify/jwt returns 400 (FST_JWT_BAD_REQUEST) for missing/malformed Authorization headers.
// RFC 7235 mandates 401 for missing credentials, so we normalise these errors here.
// Without this, the frontend's 401-triggered refresh/redirect flow never fires.
const JWT_MISSING_TOKEN_CODES = new Set([
  "FST_JWT_BAD_REQUEST",
  "FST_JWT_NO_AUTHORIZATION_IN_HEADER",
]);

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

  if (JWT_MISSING_TOKEN_CODES.has(error.code ?? "")) {
    return reply.status(401).send({
      success: false,
      error: "Unauthorized",
      details: {
        statusCode: 401,
        code: "UNAUTHORIZED",
      },
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
