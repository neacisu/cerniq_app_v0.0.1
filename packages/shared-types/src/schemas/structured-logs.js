import { z } from "zod";
export const LogLevelSchema = z.enum(["trace", "debug", "info", "warn", "error", "fatal"]);
export const StructuredLogSchema = z.object({
    level: LogLevelSchema,
    time: z.number(),
    msg: z.string(),
    service: z.string(),
    tenantId: z.uuid().optional(),
    requestId: z.uuid().optional(),
    correlationId: z.uuid().optional(),
    userId: z.uuid().optional(),
    traceId: z.string().optional(),
    spanId: z.string().optional(),
    trace_id: z.string().optional(),
    span_id: z.string().optional(),
    workerName: z.string().optional(),
    queueName: z.string().optional(),
    jobId: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.uuid().optional(),
    errorFingerprint: z.string().optional(),
    errorClassification: z.string().optional(),
    hostname: z.string().optional(),
    pid: z.number().int().optional(),
    etapa: z.string().optional(),
    httpRoute: z.string().optional(),
    requestBodyHash: z.string().optional(),
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
