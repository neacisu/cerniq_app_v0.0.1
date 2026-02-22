import { z } from "zod";

export const ApprovalUrgencySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);
export type ApprovalUrgency = z.infer<typeof ApprovalUrgencySchema>;

export const ApprovalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "escalated",
  "expired",
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalTypeSchema = z.enum([
  "company_validation",
  "lead_qualification",
  "outreach_approval",
  "price_override",
  "discount_approval",
  "invoice_approval",
  "refund_approval",
  "credit_limit",
  "rma_approval",
]);
export type ApprovalType = z.infer<typeof ApprovalTypeSchema>;

export const ApprovalTaskSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: ApprovalTypeSchema,
  status: ApprovalStatusSchema.default("pending"),
  urgency: ApprovalUrgencySchema.default("medium"),
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
  aiRecommendation: z.enum(["approve", "reject", "review"]).optional(),
  requestedBy: z.string().uuid(),
  assignedTo: z.string().uuid().optional(),
  decidedBy: z.string().uuid().optional(),
  decidedAt: z.coerce.date().optional(),
  decision: z.enum(["approved", "rejected"]).optional(),
  decisionReason: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ApprovalTask = z.infer<typeof ApprovalTaskSchema>;
