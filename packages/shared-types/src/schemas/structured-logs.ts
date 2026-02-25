import { z } from "zod";

export const LogLevelSchema = z.enum(["trace", "debug", "info", "warn", "error", "fatal"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const StructuredLogSchema = z.object({
  level: LogLevelSchema,
  time: z.number(),
  msg: z.string(),
  service: z.string(),
  tenantId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  correlationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  duration: z.number().optional(),
  statusCode: z.number().optional(),
  error: z
    .object({
      message: z.string(),
      stack: z.string().optional(),
      code: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type StructuredLog = z.infer<typeof StructuredLogSchema>;
