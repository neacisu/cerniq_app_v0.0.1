import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

declare module "fastify" {
  interface FastifyRequest {
    validatedBody?: unknown;
    validatedQuery?: unknown;
    validatedParams?: unknown;
  }
}

function sendValidationError(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({
    success: false,
    error: "VALIDATION_ERROR",
    details: error.issues,
  });
}

export const validateBody =
  <T extends z.ZodTypeAny>(schema: T) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);
    request.validatedBody = parsed.data;
  };

export const validateQuery =
  <T extends z.ZodTypeAny>(schema: T) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = schema.safeParse(request.query);
    if (!parsed.success) return sendValidationError(reply, parsed.error);
    request.validatedQuery = parsed.data;
  };

export const validateParams =
  <T extends z.ZodTypeAny>(schema: T) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = schema.safeParse(request.params);
    if (!parsed.success) return sendValidationError(reply, parsed.error);
    request.validatedParams = parsed.data;
  };
