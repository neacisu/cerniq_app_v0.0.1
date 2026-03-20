import { z } from "zod";
import { emailSchema, uuidSchema } from "./common.js";

export const importConfigSchema = z.object({
  mapping: z.record(z.string(), z.string()).optional(),
  hasHeader: z.boolean().default(true),
  encoding: z.enum(["utf-8", "iso-8859-2", "win-1250"]).default("utf-8"),
  delimiter: z.enum([",", ";", "\t"]).optional(),
  sheetName: z.string().trim().min(1).max(120).optional(),
  sourceType: z
    .enum(["csv_import", "webhook", "scrape", "manual", "api", "excel_import"])
    .optional(),
});

export const createBronzeContactSchema = z.object({
  sourceType: z.enum(["csv_import", "webhook", "scrape", "manual", "api", "excel_import"]),
  rawPayload: z.record(z.string(), z.unknown()),
  extractedName: z.string().trim().max(255).optional(),
  extractedCui: z.string().trim().max(32).optional(),
  extractedEmail: emailSchema.optional(),
  extractedPhone: z.string().trim().max(32).optional(),
});

export const listBronzeContactsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  status: z.enum(["pending", "processing", "promoted", "rejected", "error"]).optional(),
  sourceType: z
    .enum(["csv_import", "webhook", "scrape", "manual", "api", "excel_import"])
    .optional(),
  search: z.string().trim().min(1).max(255).optional(),
  batchId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const listApprovalTasksSchema = z.object({
  statuses: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : undefined,
    ),
  assignedTo: uuidSchema.optional(),
  unassigned: z.coerce.boolean().optional(),
  approvalType: z
    .enum([
      "dedup_review",
      "quality_review",
      "identity_conflict",
      "ai_structuring_review",
      "ai_merge_review",
      "low_confidence_review",
      "data_anomaly",
      "manual_verification",
      "error_review",
    ])
    .optional(),
  priority: z.enum(["critical", "high", "normal", "low"]).optional(),
  pipelineStage: z.string().max(10).optional(),
  overdue: z.coerce.boolean().optional(),
  sortBy: z.enum(["dueAt", "createdAt", "priorityLevel"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const assignTaskSchema = z.object({
  userId: uuidSchema,
});

export const decisionSchema = z.object({
  decision: z.enum(["approve", "reject", "merge", "skip"]),
  reason: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const escalateTaskSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
  escalateTo: uuidSchema.optional(),
});

export const listSilverCompaniesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  search: z.string().trim().max(255).optional(),
  enrichmentStatus: z.enum(["pending", "in_progress", "complete", "partial", "failed"]).optional(),
  promotionStatus: z.enum(["eligible", "review_required", "blocked", "promoted"]).optional(),
  statusFirma: z.enum(["ACTIVA", "INACTIVA", "DIZOLVARE", "RADIATA", "INSOLVENTA"]).optional(),
  judet: z.string().trim().max(120).optional(),
  minQuality: z.coerce.number().min(0).max(100).optional(),
  maxQuality: z.coerce.number().min(0).max(100).optional(),
  sortBy: z.enum(["updatedAt", "totalQualityScore", "createdAt"]).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const triggerEnrichmentSchema = z.object({
  sources: z.array(z.string().trim().min(3).max(120)).optional(),
  force: z.boolean().default(false),
});

export const triggerPromotionSchema = z.object({
  force: z.boolean().default(false),
});

export const dedupDecisionSchema = z.object({
  decision: z.enum(["merge", "reject", "skip"]),
  masterCompanyId: uuidSchema.optional(),
  reason: z.string().trim().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const listGoldCompaniesSchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  currentState: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : undefined,
    ),
  judetCod: z.string().trim().max(10).optional(),
  assignedTo: uuidSchema.optional(),
  unassigned: z.coerce.boolean().optional(),
  doNotContact: z.coerce.boolean().optional(),
  minLeadScore: z.coerce.number().min(0).max(100).optional(),
  maxLeadScore: z.coerce.number().min(0).max(100).optional(),
  isAgricultural: z.coerce.boolean().optional(),
  sortBy: z.enum(["updatedAt", "leadScore", "createdAt"]).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const updateLeadStateSchema = z.object({
  currentState: z
    .enum([
      "COLD",
      "CONTACTED_WA",
      "CONTACTED_EMAIL",
      "CONTACTED_PHONE",
      "WARM_REPLY",
      "ENGAGED",
      "NEGOTIATION",
      "PROPOSAL",
      "CLOSING",
      "CONVERTED",
      "ONBOARDING",
      "NURTURING_ACTIVE",
      "AT_RISK",
      "LOYAL_ADVOCATE",
      "CHURNED",
      "DEAD",
      "DO_NOT_CONTACT",
    ])
    .optional(),
  doNotContact: z.boolean().optional(),
  canalPreferat: z.enum(["whatsapp", "email", "phone", "sms"]).optional(),
});

export const assignLeadSchema = z.object({
  assignedTo: uuidSchema.nullable().optional(),
});
