import { z } from "zod";
export const LeadScoreSchema = z.number().min(0).max(100);
export const LeadSchema = z.object({
    id: z.uuid(),
    tenantId: z.uuid(),
    companyId: z.uuid(),
    contactId: z.uuid().optional(),
    score: LeadScoreSchema.default(0),
    status: z.enum([
        "cold",
        "contacted_wa",
        "contacted_email",
        "warm_reply",
        "negotiation",
        "converted",
        "dead",
    ]),
    channel: z.enum(["whatsapp", "email", "phone", "manual"]).optional(),
    sentimentScore: z.number().min(-1).max(1).optional(),
    revenuePotential: z.number().min(0).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
export const LeadCreateSchema = LeadSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
//# sourceMappingURL=lead.js.map