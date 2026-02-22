import { z } from "zod";

export const ContactSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: z.string().uuid(),
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  role: z.string().max(200).optional(),
  source: z.enum(["import", "manual", "api", "enrichment"]).default("import"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Contact = z.infer<typeof ContactSchema>;
export const ContactCreateSchema = ContactSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type ContactCreate = z.infer<typeof ContactCreateSchema>;
