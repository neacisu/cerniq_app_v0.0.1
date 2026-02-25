import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "./app-error.js";
import { envConfig } from "../config.js";

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        statusCode: error.statusCode,
        error: error.code,
        message: error.message,
      },
    });
  }

  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        statusCode: 400,
        error: "VALIDATION_ERROR",
        message: "Validation failed",
        details: error.validation,
      },
    });
  }

  const statusCode = error.statusCode ?? 500;
  return reply.status(statusCode).send({
    success: false,
    error: {
      statusCode,
      error: "INTERNAL_ERROR",
      message: envConfig.NODE_ENV === "production" ? "Internal Server Error" : error.message,
    },
  });
}
