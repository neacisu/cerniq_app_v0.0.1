import { z } from "zod";
export const ApiErrorSchema = z.object({
    statusCode: z.number(),
    error: z.string(),
    message: z.string(),
    code: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
});
export const PaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
});
export function ApiResponseSchema(dataSchema) {
    return z.object({
        success: z.literal(true),
        data: dataSchema,
        pagination: PaginationSchema.optional(),
        meta: z.record(z.string(), z.unknown()).optional(),
    });
}
export function ApiErrorResponseSchema() {
    return z.object({
        success: z.literal(false),
        error: ApiErrorSchema,
    });
}
//# sourceMappingURL=api-response.js.map