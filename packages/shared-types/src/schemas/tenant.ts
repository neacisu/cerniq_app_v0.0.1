import { z } from "zod";

export const TenantStatusSchema = z.enum(["active", "suspended", "trial", "cancelled"]);
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

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

export type Tenant = z.infer<typeof TenantSchema>;
export const TenantCreateSchema = TenantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type TenantCreate = z.infer<typeof TenantCreateSchema>;
