import { z } from "zod";
export const cuiRegex = /^RO\d{2,10}$/;
export const CompanySchema = z.object({
    id: z.uuid(),
    tenantId: z.uuid(),
    cui: z.string().regex(cuiRegex, "CUI must match RO + 2-10 digits"),
    name: z.string().min(1).max(500),
    county: z.string().max(100).optional(),
    city: z.string().max(200).optional(),
    address: z.string().max(500).optional(),
    status: z.enum(["raw", "validated", "enriched", "qualified", "rejected"]),
    anafValid: z.boolean().default(false),
    termeneValid: z.boolean().default(false),
    tier: z.enum(["bronze", "silver", "gold"]).default("bronze"),
    qualityScore: z.number().min(0).max(100).default(0),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
export const CompanyCreateSchema = CompanySchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
