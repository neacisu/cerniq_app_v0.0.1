import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "./app-error.js";
import { envConfig } from "../config.js";

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
