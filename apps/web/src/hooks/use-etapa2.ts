import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AnalyticsParams,
  ApiListResponse,
  ApiObjectResponse,
  DailyStat,
  LeadsListParams,
  OutreachAnalytics,
  OutreachCampaign,
  OutreachDashboard,
  PhoneAnalytics,
  ReviewAction,
  ReviewsListParams,
  SequencesListParams,
  TemplateStatus,
  TemplatesListParams,
  WaPhone,
  OutreachLead,
} from "@/lib/etapa2-api";
import {
  assignReview,
  createOutreachSequence,
  createOutreachTemplate,
  enrollLeadsInSequence,
  fetchOutreachCampaigns,
  fetchOutreachAnalytics,
  fetchPhoneAnalytics,
  fetchOutreachDailyStats,
  fetchOutreachDashboard,
  fetchOutreachNotifications,
  fetchOutreachSettings,
  fetchOutreachLeadById,
  fetchLeadActivity,
  fetchOutreachLeads,
  fetchOutreachPhoneById,
  fetchOutreachPhones,
  fetchOutreachReviewById,
  fetchOutreachReviews,
  fetchOutreachSequenceById,
  fetchOutreachSequences,
  fetchOutreachTemplateById,
  fetchOutreachTemplates,
  fetchReviewStats,
  initiateLeadTakeover,
  markAllOutreachNotificationsRead,
  markOutreachNotificationRead,
  patchOutreachLead,
  patchOutreachPhone,
  patchOutreachSettings,
  previewOutreachTemplate,
  resolveReview,
  sendOutreachMessage,
  triggerPhoneHealthCheck,
  updateOutreachSequence,
  updateOutreachTemplate,
} from "@/lib/etapa2-api";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useOutreachDashboard(period: "7d" | "30d" | "90d" | "custom" = "7d") {
  return useQuery<ApiObjectResponse<OutreachDashboard>>({
    queryKey: ["etapa2", "dashboard", period],
    queryFn: () => fetchOutreachDashboard(period),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useOutreachSettings() {
  return useQuery({
    queryKey: ["etapa2", "settings"],
    queryFn: fetchOutreachSettings,
    staleTime: 60_000,
  });
}

export function usePatchOutreachSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchOutreachSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa2", "settings"] }).catch(() => undefined);
    },
  });
}

export function useOutreachNotifications(unread?: boolean) {
  return useQuery({
    queryKey: ["etapa2", "notifications", unread ?? "all"],
    queryFn: () => fetchOutreachNotifications(unread),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markOutreachNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa2", "notifications"] }).catch(() => undefined);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllOutreachNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa2", "notifications"] }).catch(() => undefined);
    },
  });
}

export function useOutreachAnalytics(params: AnalyticsParams = {}) {
  return useQuery<ApiObjectResponse<OutreachAnalytics>>({
    queryKey: ["etapa2", "analytics", params],
    queryFn: () => fetchOutreachAnalytics(params),
    staleTime: 60_000,
  });
}

export function useOutreachDailyStats(params: { from?: string; to?: string } = {}) {
  return useQuery<ApiListResponse<DailyStat>>({
    queryKey: ["etapa2", "analytics", "daily", params],
    queryFn: () => fetchOutreachDailyStats(params),
    staleTime: 60_000,
  });
}

function analyticsPeriodToRange(
  period: AnalyticsParams["period"] | undefined,
  custom?: { from?: string; to?: string },
): { from: string; to: string } {
  if (period === "custom" && custom?.from && custom?.to) {
    return { from: custom.from, to: custom.to };
  }
  const to = new Date();
  let days = 7;
  if (period === "30d") days = 30;
  else if (period === "90d") days = 90;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Metrici per telefon WA (GET /analytics/phones), aliniat la perioada selectată. */
export function usePhoneAnalytics(params: AnalyticsParams & { phoneId?: string } = {}) {
  const { period, from: fromParam, to: toParam, phoneId } = params;
  const range = analyticsPeriodToRange(period, { from: fromParam, to: toParam });

  return useQuery<ApiObjectResponse<PhoneAnalytics>>({
    queryKey: ["etapa2", "analytics", "phones", range.from, range.to, phoneId],
    queryFn: () =>
      fetchPhoneAnalytics({
        from: range.from,
        to: range.to,
        phoneId,
      }),
    staleTime: 60_000,
  });
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export function useOutreachLeads(params: LeadsListParams = {}) {
  return useQuery({
    queryKey: ["etapa2", "leads", params],
    queryFn: () => fetchOutreachLeads(params),
    staleTime: 30_000,
  });
}

export function useOutreachLead(id?: string) {
  return useQuery({
    queryKey: ["etapa2", "leads", "detail", id],
    queryFn: () => fetchOutreachLeadById(String(id)),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}

export function useLeadActivity(leadId?: string) {
  return useQuery({
    queryKey: ["etapa2", "leads", "activity", leadId],
    queryFn: () => fetchLeadActivity(String(leadId)),
    enabled: Boolean(leadId),
    staleTime: 15_000,
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<Pick<OutreachLead, "currentState" | "assignedToUser" | "isHumanControlled">>;
    }) => patchOutreachLead(id, payload),
    onSuccess: async (_data, { id }) => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "leads"] });
      await qc.invalidateQueries({ queryKey: ["etapa2", "leads", "detail", id] });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        channel: "WHATSAPP" | "EMAIL_WARM";
        content: string;
        subject?: string;
        templateId?: string;
        scheduledAt?: string;
      };
    }) => sendOutreachMessage(id, payload),
    onSuccess: async (_data, { id }) => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "leads", "detail", id] });
      await qc.invalidateQueries({ queryKey: ["etapa2", "leads", "activity", id] });
    },
  });
}

export function useTakeover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      initiateLeadTakeover(id, reason),
    onSuccess: async (_data, { id }) => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "leads"] });
      await qc.invalidateQueries({ queryKey: ["etapa2", "leads", "detail", id] });
    },
  });
}

// ─── Phones ───────────────────────────────────────────────────────────────────

export function useOutreachPhones() {
  return useQuery({
    queryKey: ["etapa2", "phones"],
    queryFn: fetchOutreachPhones,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useOutreachPhone(id?: string) {
  return useQuery({
    queryKey: ["etapa2", "phones", "detail", id],
    queryFn: () => fetchOutreachPhoneById(String(id)),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useUpdatePhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<Pick<WaPhone, "label" | "isEnabled" | "priority" | "status">>;
    }) => patchOutreachPhone(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "phones"] });
    },
  });
}

export function usePhoneHealthCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => triggerPhoneHealthCheck(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "phones"] });
    },
  });
}

// ─── Sequences ────────────────────────────────────────────────────────────────

export function useOutreachSequences(params: SequencesListParams = {}) {
  return useQuery({
    queryKey: ["etapa2", "sequences", params],
    queryFn: () => fetchOutreachSequences(params),
    staleTime: 30_000,
  });
}

export function useOutreachSequence(id?: string) {
  return useQuery({
    queryKey: ["etapa2", "sequences", "detail", id],
    queryFn: () => fetchOutreachSequenceById(String(id)),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCreateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createOutreachSequence>[0]) =>
      createOutreachSequence(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "sequences"] });
    },
  });
}

export function useUpdateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateOutreachSequence>[1];
    }) => updateOutreachSequence(id, payload),
    onSuccess: async (_data, { id }) => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "sequences"] });
      await qc.invalidateQueries({ queryKey: ["etapa2", "sequences", "detail", id] });
    },
  });
}

export function useEnrollSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sequenceId,
      payload,
    }: {
      sequenceId: string;
      payload: { leadIds: string[]; startStep?: number; scheduledStart?: string };
    }) => enrollLeadsInSequence(sequenceId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "sequences"] });
      await qc.invalidateQueries({ queryKey: ["etapa2", "leads"] });
    },
  });
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function useOutreachTemplates(params: TemplatesListParams = {}) {
  return useQuery({
    queryKey: ["etapa2", "templates", params],
    queryFn: () => fetchOutreachTemplates(params),
    staleTime: 60_000,
  });
}

export function useOutreachTemplate(id?: string) {
  return useQuery({
    queryKey: ["etapa2", "templates", "detail", id],
    queryFn: () => fetchOutreachTemplateById(String(id)),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createOutreachTemplate>[0]) =>
      createOutreachTemplate(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
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
      }>;
    }) => updateOutreachTemplate(id, payload),
    onSuccess: async (_data, { id }) => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "templates"] });
      await qc.invalidateQueries({ queryKey: ["etapa2", "templates", "detail", id] });
    },
  });
}

export function usePreviewTemplate() {
  return useMutation({
    mutationFn: ({ id, variables }: { id: string; variables?: Record<string, string> }) =>
      previewOutreachTemplate(id, { variables }),
  });
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export function useOutreachReviews(params: ReviewsListParams = {}) {
  return useQuery({
    queryKey: ["etapa2", "reviews", params],
    queryFn: () => fetchOutreachReviews(params),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useOutreachReview(id?: string) {
  return useQuery({
    queryKey: ["etapa2", "reviews", "detail", id],
    queryFn: () => fetchOutreachReviewById(String(id)),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}

export function useReviewStats() {
  return useQuery({
    queryKey: ["etapa2", "reviews", "stats"],
    queryFn: fetchReviewStats,
    staleTime: 60_000,
  });
}

export function useAssignReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => assignReview(id, userId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "reviews"] });
    },
  });
}

export function useResolveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { action: ReviewAction; editedContent?: string; notes?: string };
    }) => resolveReview(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa2", "reviews"] });
      await qc.invalidateQueries({ queryKey: ["etapa2", "leads"] });
    },
  });
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export function useOutreachCampaigns() {
  return useQuery<ApiListResponse<OutreachCampaign>>({
    queryKey: ["etapa2", "campaigns"],
    queryFn: fetchOutreachCampaigns,
    staleTime: 120_000,
  });
}
