import { z } from "zod";
export const EventBaseSchema = z.object({
    eventId: z.string().uuid(),
    eventType: z.string().min(1),
    tenantId: z.string().uuid(),
    timestamp: z.coerce.date(),
    source: z.string().min(1),
    version: z.string().default("1.0"),
    correlationId: z.string().uuid().optional(),
    payload: z.record(z.string(), z.unknown()),
});
export const EventTypes = {
    COMPANY_IMPORTED: "company.imported",
    COMPANY_VALIDATED: "company.validated",
    COMPANY_ENRICHED: "company.enriched",
    LEAD_CREATED: "lead.created",
    LEAD_SCORED: "lead.scored",
    LEAD_CONVERTED: "lead.converted",
    APPROVAL_REQUESTED: "approval.requested",
    APPROVAL_DECIDED: "approval.decided",
    OUTREACH_SENT: "outreach.sent",
    OUTREACH_REPLIED: "outreach.replied",
};
