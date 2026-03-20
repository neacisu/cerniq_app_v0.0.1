import { api } from "./api.js";

export type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  meta?: { total?: number; page?: number; limit?: number; pages?: number; filters?: unknown };
};

export type ApiObjectResponse<T> = { success: boolean; data: T };

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeadState =
  | "COLD"
  | "CONTACTED_WA"
  | "CONTACTED_EMAIL"
  | "WARM_REPLY"
  | "NEGOTIATION"
  | "CONVERTED"
  | "DEAD"
  | "PAUSED";

export type LeadChannel = "WHATSAPP" | "EMAIL_COLD" | "EMAIL_WARM" | "PHONE" | "MANUAL";

export type MessageDirection = "INBOUND" | "OUTBOUND";

export type MessageStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "REPLIED"
  | "OPENED"
  | "BOUNCED"
  | "FAILED";

export type PhoneStatus = "ACTIVE" | "PAUSED" | "OFFLINE" | "BANNED" | "RECONNECTING";

export type ReviewPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export type ReviewStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "ESCALATED"
  | "EXPIRED";

export type ReviewAction = "APPROVED" | "EDITED" | "REJECTED" | "TAKEOVER" | "IGNORED";

export type SequenceStatus = "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED" | "CONVERTED";

export type TemplateStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

export type TemplateType = "INITIAL" | "FOLLOWUP" | "RESPONSE" | "CLOSING";

export type TemplateChannel = "WHATSAPP" | "EMAIL";

export interface OutreachLead {
  id: string;
  tenantId: string;
  leadId: string;
  companyId: string;
  currentState: LeadState;
  previousState: LeadState | null;
  stateChangedAt: string;
  channel: LeadChannel | null;
  assignedPhoneId: string | null;
  isHumanControlled: boolean;
  requiresHumanReview: boolean;
  nextActionAt: string | null;
  sentimentScore: number | null;
  intent: string | null;
  engagementScore: number | null;
  lastContactAt: string | null;
  notes: string | null;
  assignedToUser: string | null;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    cui: string;
    judet: string;
    localitate: string;
    telefon: string | null;
    email: string | null;
    website: string | null;
  };
  communications?: CommunicationLog[];
}

export interface CommunicationLog {
  id: string;
  journeyId: string;
  tenantId: string;
  channel: LeadChannel;
  direction: MessageDirection;
  messageStatus: MessageStatus;
  contentPreview: string | null;
  externalMessageId: string | null;
  threadId: string | null;
  phoneId: string | null;
  quotaCost: number;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface WaPhone {
  id: string;
  tenantId: string;
  phoneNumber: string;
  label: string;
  timelinesaiPhoneId: string | null;
  status: PhoneStatus;
  isEnabled: boolean;
  priority: number;
  dailyQuotaLimit: number;
  reputationScore: number;
  lastHealthCheckAt: string | null;
  createdAt: string;
  updatedAt: string;
  currentUsage?: number;
  quotaPercentage?: number;
}

export interface OutreachSequence {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  stopOnReply: boolean;
  respectBusinessHours: boolean;
  totalEnrolled: number;
  totalCompletions: number;
  totalConversions: number;
  createdAt: string;
  updatedAt: string;
  steps?: SequenceStep[];
}

export interface SequenceStep {
  id: string;
  sequenceId: string;
  stepNumber: number;
  channel: LeadChannel;
  templateId: string | null;
  delayHours: number;
  delayMinutes: number;
  subject: string | null;
}

export interface OutreachTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  channel: TemplateChannel;
  subject: string | null;
  bodyTemplate: string;
  templateType: TemplateType;
  status: TemplateStatus;
  variables: string[];
  hasMedia: boolean;
  mediaType: string | null;
  mediaUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewItem {
  id: string;
  tenantId: string;
  journeyId: string;
  priority: ReviewPriority;
  status: ReviewStatus;
  reason: string;
  triggerContent: string | null;
  aiSuggestedResponse: string | null;
  slaBreached: boolean;
  slaDueAt: string;
  assignedToUser: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionAction: ReviewAction | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: OutreachLead;
}

export interface OutreachDashboard {
  kpis: {
    messagesSent: number;
    replies: number;
    conversionRate: number;
    activeSequences: number;
    pendingReviews: number;
  };
  channelPerformance: {
    channel: string;
    sent: number;
    delivered: number;
    replied: number;
    bounced: number;
  }[];
  leadFunnel: { state: LeadState; count: number }[];
  sentimentDistribution: { category: string; count: number }[];
  recentActivity: {
    id: string;
    leadId: string;
    company: string;
    action: string;
    timestamp: string;
  }[];
  phones: WaPhone[];
}

export interface OutreachAnalytics {
  period: string;
  byChannel: {
    whatsapp: { sent: number; delivered: number; replied: number; quotaUsed: number };
    emailCold: { sent: number; opened: number; replied: number; bounced: number };
    emailWarm: { sent: number; opened: number; replied: number; bounced: number };
  };
  funnel: { state: LeadState; count: number }[];
  sentiment: { negative: number; neutral: number; positive: number };
  daily: DailyStat[];
}

export interface DailyStat {
  statDate: string;
  messagesSent: number;
  messagesReceived: number;
  newContacts: number;
  replies: number;
  conversions: number;
  bounceCount: number;
  quotaUsageAvg: number;
}

export interface OutreachCampaign {
  id: string;
  name: string;
  status: string;
  sent: number;
  opens: number;
  replies: number;
  bounces: number;
  bounceRate: number;
}

// ─── Params ───────────────────────────────────────────────────────────────────

export type LeadsListParams = {
  state?: LeadState;
  channel?: LeadChannel;
  assignedTo?: string;
  assignedPhone?: string;
  hasReply?: boolean;
  needsReview?: boolean;
  search?: string;
  minSentiment?: number;
  maxSentiment?: number;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: "nextActionAt" | "lastContactAt" | "sentimentScore" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type SequencesListParams = {
  isActive?: boolean;
  page?: number;
  limit?: number;
};

export type TemplatesListParams = {
  channel?: TemplateChannel;
  status?: TemplateStatus;
  type?: TemplateType;
  page?: number;
  limit?: number;
};

export type ReviewsListParams = {
  priority?: ReviewPriority;
  status?: ReviewStatus;
  page?: number;
  limit?: number;
};

export type AnalyticsParams = {
  period?: "7d" | "30d" | "90d" | "custom";
  from?: string;
  to?: string;
};

// ─── Leads API ────────────────────────────────────────────────────────────────

export async function fetchOutreachLeads(params: LeadsListParams = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs}` : "";
  return api.get<ApiListResponse<OutreachLead>>(`/api/v1/outreach/leads${query}`);
}

export async function fetchOutreachLeadById(id: string) {
  return api.get<ApiObjectResponse<OutreachLead>>(`/api/v1/outreach/leads/${id}`);
}

export async function patchOutreachLead(
  id: string,
  payload: Partial<
    Pick<OutreachLead, "currentState" | "assignedToUser" | "isHumanControlled" | "notes">
  >,
) {
  return api.patch<ApiObjectResponse<OutreachLead>>(`/api/v1/outreach/leads/${id}`, payload);
}

export async function sendOutreachMessage(
  id: string,
  payload: {
    channel: "WHATSAPP" | "EMAIL_WARM";
    content: string;
    subject?: string;
    templateId?: string;
    scheduledAt?: string;
  },
) {
  return api.post<ApiObjectResponse<{ messageId: string; status: string; scheduledAt?: string }>>(
    `/api/v1/outreach/leads/${id}/send-message`,
    payload,
  );
}

export async function initiateLeadTakeover(id: string, reason: string) {
  return api.post<ApiObjectResponse<{ success: boolean }>>(
    `/api/v1/outreach/leads/${id}/takeover`,
    {
      reason,
    },
  );
}

// ─── Sequences API ────────────────────────────────────────────────────────────

export async function fetchOutreachSequences(params: SequencesListParams = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs}` : "";
  return api.get<ApiListResponse<OutreachSequence>>(`/api/v1/outreach/sequences${query}`);
}

export async function fetchOutreachSequenceById(id: string) {
  return api.get<ApiObjectResponse<OutreachSequence>>(`/api/v1/outreach/sequences/${id}`);
}

export async function createOutreachSequence(payload: {
  name: string;
  description?: string;
  primaryChannel: "WHATSAPP" | "EMAIL";
  respectBusinessHours?: boolean;
  stopOnReply?: boolean;
  steps: {
    delayHours: number;
    delayMinutes: number;
    channel: LeadChannel;
    templateId?: string;
  }[];
}) {
  return api.post<ApiObjectResponse<OutreachSequence>>("/api/v1/outreach/sequences", payload);
}

/** Pași trimiși la PATCH — aliniați la schema API (fără id / sequenceId în body). */
export type OutreachSequenceStepPatch = {
  delayHours: number;
  delayMinutes: number;
  channel: LeadChannel;
  templateId?: string;
};

export async function updateOutreachSequence(
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    isActive: boolean;
    stopOnReply: boolean;
    respectBusinessHours: boolean;
    steps: OutreachSequenceStepPatch[];
  }>,
) {
  return api.patch<ApiObjectResponse<OutreachSequence>>(
    `/api/v1/outreach/sequences/${id}`,
    payload,
  );
}

export async function enrollLeadsInSequence(
  sequenceId: string,
  payload: { leadIds: string[]; startStep?: number; scheduledStart?: string },
) {
  return api.post<ApiObjectResponse<{ enrolled: number; skipped: number }>>(
    `/api/v1/outreach/sequences/${sequenceId}/enroll`,
    payload,
  );
}

// ─── Templates API ────────────────────────────────────────────────────────────

export async function fetchOutreachTemplates(params: TemplatesListParams = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs}` : "";
  return api.get<ApiListResponse<OutreachTemplate>>(`/api/v1/outreach/templates${query}`);
}

export async function fetchOutreachTemplateById(id: string) {
  return api.get<ApiObjectResponse<OutreachTemplate>>(`/api/v1/outreach/templates/${id}`);
}

export async function createOutreachTemplate(payload: {
  name: string;
  description?: string;
  channel: TemplateChannel;
  subject?: string;
  bodyTemplate: string;
  templateType: TemplateType;
  variables?: string[];
  hasMedia?: boolean;
  mediaType?: string;
  mediaUrl?: string;
}) {
  return api.post<ApiObjectResponse<OutreachTemplate>>("/api/v1/outreach/templates", payload);
}

export async function updateOutreachTemplate(
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    subject: string;
    bodyTemplate: string;
    status: TemplateStatus;
    variables: string[];
    hasMedia: boolean;
    mediaType: string;
    mediaUrl: string;
  }>,
) {
  return api.patch<ApiObjectResponse<OutreachTemplate>>(
    `/api/v1/outreach/templates/${id}`,
    payload,
  );
}

export async function previewOutreachTemplate(
  id: string,
  payload: { variables?: Record<string, string> },
) {
  return api.post<ApiObjectResponse<{ preview: string }>>(
    `/api/v1/outreach/templates/${id}/preview`,
    payload,
  );
}

// ─── Phones API ───────────────────────────────────────────────────────────────

export async function fetchOutreachPhones() {
  return api.get<ApiListResponse<WaPhone>>("/api/v1/outreach/phones");
}

export async function fetchOutreachPhoneById(id: string) {
  return api.get<ApiObjectResponse<WaPhone>>(`/api/v1/outreach/phones/${id}`);
}

export async function patchOutreachPhone(
  id: string,
  payload: Partial<Pick<WaPhone, "label" | "isEnabled" | "priority" | "status">>,
) {
  return api.patch<ApiObjectResponse<WaPhone>>(`/api/v1/outreach/phones/${id}`, payload);
}

export async function triggerPhoneHealthCheck(id: string) {
  return api.post<ApiObjectResponse<{ queued: boolean }>>(
    `/api/v1/outreach/phones/${id}/health-check`,
    {},
  );
}

// ─── Reviews API ──────────────────────────────────────────────────────────────

export async function fetchOutreachReviews(params: ReviewsListParams = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs}` : "";
  return api.get<ApiListResponse<ReviewItem>>(`/api/v1/outreach/reviews${query}`);
}

export async function fetchOutreachReviewById(id: string) {
  return api.get<ApiObjectResponse<ReviewItem>>(`/api/v1/outreach/reviews/${id}`);
}

export async function assignReview(id: string, userId: string) {
  return api.post<ApiObjectResponse<ReviewItem>>(`/api/v1/outreach/reviews/${id}/assign`, {
    userId,
  });
}

export async function resolveReview(
  id: string,
  payload: { action: ReviewAction; editedContent?: string; notes?: string },
) {
  return api.post<ApiObjectResponse<ReviewItem>>(`/api/v1/outreach/reviews/${id}/resolve`, payload);
}

export async function fetchReviewStats() {
  return api.get<
    ApiObjectResponse<{
      avgResolutionTimeMs: number;
      slaBreachRate: number;
      reviewsPerDay: number;
      byPriority: Record<ReviewPriority, number>;
      byStatus: Record<ReviewStatus, number>;
    }>
  >("/api/v1/outreach/reviews/stats");
}

// ─── Analytics API ────────────────────────────────────────────────────────────

export async function fetchOutreachDashboard() {
  return api.get<ApiObjectResponse<OutreachDashboard>>(
    "/api/v1/outreach/analytics/overview?period=7d",
  );
}

export async function fetchOutreachAnalytics(params: AnalyticsParams = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs}` : "";
  return api.get<ApiObjectResponse<OutreachAnalytics>>(
    `/api/v1/outreach/analytics/overview${query}`,
  );
}

export async function fetchOutreachDailyStats(params: { from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs}` : "";
  return api.get<ApiListResponse<DailyStat>>(`/api/v1/outreach/analytics/daily${query}`);
}

// ─── Campaigns API ────────────────────────────────────────────────────────────

export async function fetchOutreachCampaigns() {
  return api.get<ApiListResponse<OutreachCampaign>>("/api/v1/outreach/campaigns");
}
