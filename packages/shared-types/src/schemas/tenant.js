import { z } from "zod";
export const TenantStatusSchema = z.enum(["active", "suspended", "trial", "cancelled"]);
export const TenantSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    slug: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-z0-9-]+$/),
    status: TenantStatusSchema.default("trial"),
    settings: z.record(z.string(), z.unknown()).default({}),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
export const TenantCreateSchema = TenantSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
//# sourceMappingURL=tenant.js.map