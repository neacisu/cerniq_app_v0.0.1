import { z } from "zod";

const uuidSchema = z.uuid();

export const ApprovalUrgencySchema = z.enum(["low", "medium", "high", "critical"]);
export type ApprovalUrgency = z.infer<typeof ApprovalUrgencySchema>;

export const ApprovalStatusSchema = z.enum([
  "pending",
  "assigned",
  "approved",
  "rejected",
  "escalated",
  "expired",
  "cancelled",
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalPrioritySchema = z.enum(["critical", "high", "normal", "low"]);
export type ApprovalPriority = z.infer<typeof ApprovalPrioritySchema>;

export const ApprovalTypeSchema = z.enum([
  "dedup_review",
  "quality_review",
  "identity_conflict",
  "ai_structuring_review",
  "ai_merge_review",
  "low_confidence_review",
  "data_anomaly",
  "manual_verification",
  "error_review",
]);
export type ApprovalType = z.infer<typeof ApprovalTypeSchema>;

export const ApprovalDecisionSchema = z.enum(["approve", "reject", "merge", "skip"]);
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const ApprovalTaskSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  type: z.string().min(1),
  approvalType: ApprovalTypeSchema,
  status: ApprovalStatusSchema.default("pending"),
  urgency: ApprovalUrgencySchema.default("medium"),
  priorityLevel: ApprovalPrioritySchema.default("normal"),
  pipelineStage: z.string().default("E1"),
  entityType: z.string().min(1),
  entityId: uuidSchema,
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
  aiRecommendation: z.enum(["approve", "reject", "review"]).optional(),
  aiReasoning: z.string().optional(),
  requestedBy: uuidSchema,
  createdBy: uuidSchema.optional(),
  assignedTo: uuidSchema.optional(),
  assignedAt: z.coerce.date().optional(),
  decidedBy: uuidSchema.optional(),
  decidedAt: z.coerce.date().optional(),
  decision: z.string().optional(),
  decisionReason: z.string().optional(),
  decisionMetadata: z.record(z.string(), z.unknown()).optional(),
  dueAt: z.coerce.date().optional(),
  escalationLevel: z.number().int().default(0),
  escalatedAt: z.coerce.date().optional(),
  escalatedTo: uuidSchema.optional(),
  blockedJobId: z.string().optional(),
  blockedQueueName: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  etapa: z.string(),
  priority: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ApprovalTask = z.infer<typeof ApprovalTaskSchema>;
