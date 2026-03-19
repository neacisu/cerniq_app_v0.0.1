import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api.js";
import {
  type ApprovalListParams,
  type BronzeContactsParams,
  type DailyStatsParams,
  type GoldCompaniesParams,
  type ImportListParams,
  type SilverCompaniesParams,
  type DedupCandidatesParams,
  type PromoteJobStatus,
  anafEnrichImport,
  assignApproval,
  cancelImport,
  decideApproval,
  decideDedupPair,
  fetchApprovals,
  fetchApprovalById,
  fetchApprovalStats,
  fetchBronzeContactById,
  fetchBronzeContacts,
  fetchDashboardActivity,
  fetchDashboardDailyStats,
  fetchDashboardStats,
  fetchDedupCandidates,
  fetchGoldCompanyById,
  fetchGoldCompanyJourney,
  fetchGoldCompanies,
  fetchImportById,
  fetchImportEntities,
  fetchImportReprocessErrors,
  fetchImportRows,
  fetchImports,
  fetchPromoteJobStatus,
  resumeImportReprocessErrors,
  resumePromoteJob,
  fetchQueueStatusByName,
  fetchQueueStatuses,
  fetchSilverCompanies,
  fetchSilverCompanyById,
  fetchSilverEnrichmentLog,
  patchGoldCompany,
  pauseQueue,
  reprocessBronzeContact,
  resumeQueue,
  transitionGoldCompany,
  triggerSilverEnrich,
  triggerSilverPromote,
  uploadImport,
} from "@/lib/etapa1-api.js";

function isTransientApiUnavailable(error: unknown): error is ApiError {
  return error instanceof ApiError && [502, 503, 504].includes(error.status);
}

function getPollingBackoffMs(error: unknown, failureCount: number, baseIntervalMs: number): number {
  if (!isTransientApiUnavailable(error)) {
    return baseIntervalMs;
  }

  const retryStep = Math.max(0, failureCount - 1);
  return Math.min(60_000, baseIntervalMs * 2 ** retryStep);
}

function isIdentityReprocessActive(item: Record<string, unknown> | undefined) {
  const metadata = (item?.metadata as Record<string, unknown> | undefined) ?? {};
  const state = String(metadata.identityReprocessStatus ?? "");
  return state === "queued" || state === "running";
}

function isAnafEnrichActive(item: Record<string, unknown> | undefined) {
  const metadata = (item?.metadata as Record<string, unknown> | undefined) ?? {};
  return String(metadata.anafEnrichmentStatus ?? "") === "processing";
}

function getImportRefetchInterval(item: Record<string, unknown> | undefined) {
  const status = String(item?.status ?? "");
  if (
    ["pending", "processing"].includes(status) ||
    isIdentityReprocessActive(item) ||
    isAnafEnrichActive(item)
  ) {
    return 3000;
  }

  const metadata = (item?.metadata as Record<string, unknown> | undefined) ?? {};
  const hasIdentityReprocessHistory =
    typeof metadata.identityReprocessQueuedAt === "string" ||
    typeof metadata.identityReprocessStartedAt === "string" ||
    typeof metadata.identityReprocessCompletedAt === "string" ||
    typeof metadata.identityReprocessFailedAt === "string";

  return hasIdentityReprocessHistory ? 15000 : false;
}

export function useDashboardStats() {
  return useQuery({ queryKey: ["etapa1", "dashboard", "stats"], queryFn: fetchDashboardStats });
}

export function useDashboardActivity(limit = 20) {
  return useQuery({
    queryKey: ["etapa1", "dashboard", "activity", limit],
    queryFn: () => fetchDashboardActivity(limit),
  });
}

export function useImports(params: ImportListParams = {}) {
  return useQuery({
    queryKey: ["etapa1", "imports", params],
    queryFn: () => fetchImports(params),
    refetchInterval: (query) => {
      if (isTransientApiUnavailable(query.state.error)) {
        return getPollingBackoffMs(query.state.error, query.state.fetchFailureCount, 3000);
      }

      const rows =
        (query.state.data as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];
      if (rows.some((row) => getImportRefetchInterval(row) === 3000)) {
        return 3000;
      }

      return rows.some((row) => getImportRefetchInterval(row) === 15000) ? 15000 : false;
    },
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      if (isTransientApiUnavailable(error)) {
        return false;
      }

      return failureCount < 3;
    },
  });
}

export function useImportDetail(id?: string) {
  return useQuery({
    queryKey: ["etapa1", "imports", "detail", id],
    queryFn: () => fetchImportById(String(id)),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      if (isTransientApiUnavailable(query.state.error)) {
        return getPollingBackoffMs(query.state.error, query.state.fetchFailureCount, 3000);
      }

      const item = (query.state.data as { data?: Record<string, unknown> } | undefined)?.data;
      return getImportRefetchInterval(item);
    },
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      if (isTransientApiUnavailable(error)) {
        return false;
      }

      return failureCount < 3;
    },
  });
}

export function useImportRows(id?: string, limit = 100, offset = 0) {
  return useQuery({
    queryKey: ["etapa1", "imports", "rows", id, limit, offset],
    queryFn: () => fetchImportRows(String(id), { limit, offset }),
    enabled: Boolean(id),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });
}

export function useImportReprocessErrors(id?: string, limit = 100, offset = 0) {
  return useQuery({
    queryKey: ["etapa1", "imports", "reprocess-errors", id, limit, offset],
    queryFn: () => fetchImportReprocessErrors(String(id), { limit, offset }),
    enabled: Boolean(id),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
}

export function useImportEntities(id?: string, limit = 100, offset = 0) {
  return useQuery({
    queryKey: ["etapa1", "imports", "entities", id, limit, offset],
    queryFn: () => fetchImportEntities(String(id), { limit, offset }),
    enabled: Boolean(id),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });
}

export function useUploadImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, config }: { file: File; config?: Parameters<typeof uploadImport>[1] }) =>
      uploadImport(file, config),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "imports"] });
    },
  });
}

export function useCancelImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelImport,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "imports"] });
    },
  });
}

export function useAnafEnrichImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: anafEnrichImport,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "imports"] });
    },
  });
}

export function useBronzeContacts(params: BronzeContactsParams = {}) {
  return useQuery({
    queryKey: ["etapa1", "bronze", params],
    queryFn: () => fetchBronzeContacts(params),
  });
}

export function useBronzeContactDetail(id?: string) {
  return useQuery({
    queryKey: ["etapa1", "bronze", "detail", id],
    queryFn: () => fetchBronzeContactById(String(id)),
    enabled: Boolean(id),
  });
}

export function useReprocessBronze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reprocessBronzeContact,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "bronze"] });
    },
  });
}

/** Poll the live BullMQ state of the re-promote batch job for a given import batch. */
export function usePromoteJobStatus(
  batchId: string | undefined,
  opts?: { enabled?: boolean; expectedDbStatus?: string | null },
) {
  return useQuery({
    queryKey: ["etapa1", "promote-job-status", batchId, opts?.expectedDbStatus ?? null],
    queryFn: () => fetchPromoteJobStatus(String(batchId)),
    enabled: Boolean(batchId) && (opts?.enabled ?? true),
    refetchInterval: (query) => {
      if (isTransientApiUnavailable(query.state.error)) {
        return getPollingBackoffMs(query.state.error, query.state.fetchFailureCount, 3000);
      }

      const state = (query.state.data as { data?: PromoteJobStatus } | undefined)?.data?.state;
      const expectedDbStatus = opts?.expectedDbStatus ?? null;
      if (expectedDbStatus === "queued" || expectedDbStatus === "running") {
        return 3000;
      }
      // Poll aggressively while the job is running or queued; back off otherwise
      if (state === "waiting" || state === "active" || state === "delayed" || state === "none") {
        return 3000;
      }
      if (state === "stale" || state === "stalled") {
        return 5000;
      }
      // failed / completed / unknown — stop polling
      return false;
    },
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      if (isTransientApiUnavailable(error)) {
        return false;
      }

      return failureCount < 3;
    },
  });
}

/** Force-resume a stale or failed re-promote job. */
export function useResumePromoteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resumePromoteJob,
    onSuccess: async (_data, batchId) => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "promote-job-status", batchId] });
      await qc.invalidateQueries({ queryKey: ["etapa1", "imports"] });
    },
  });
}

export function useResumeImportReprocessErrors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resumeImportReprocessErrors,
    onSuccess: async (_data, batchId) => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "imports"] });
      await qc.invalidateQueries({ queryKey: ["etapa1", "imports", "detail", batchId] });
      await qc.invalidateQueries({ queryKey: ["etapa1", "imports", "reprocess-errors", batchId] });
      await qc.invalidateQueries({ queryKey: ["etapa1", "promote-job-status", batchId] });
    },
  });
}

export function useSilverCompanies(params: SilverCompaniesParams = {}) {
  return useQuery({
    queryKey: ["etapa1", "silver", params],
    queryFn: () => fetchSilverCompanies(params),
  });
}

export function useSilverCompanyDetail(id?: string) {
  return useQuery({
    queryKey: ["etapa1", "silver", "detail", id],
    queryFn: () => fetchSilverCompanyById(String(id)),
    enabled: Boolean(id),
  });
}

export function useSilverEnrichmentLog(entityId?: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["etapa1", "silver", "enrichment-log", entityId, limit, offset],
    queryFn: () => fetchSilverEnrichmentLog(entityId, limit, offset),
  });
}

export function useTriggerSilverEnrich() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerSilverEnrich,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "silver"] });
    },
  });
}

export function useTriggerSilverPromote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerSilverPromote,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "silver"] });
    },
  });
}

export function useGoldCompanies(params: GoldCompaniesParams = {}) {
  return useQuery({
    queryKey: ["etapa1", "gold", params],
    queryFn: () => fetchGoldCompanies(params),
  });
}

export function useGoldCompanyDetail(id?: string) {
  return useQuery({
    queryKey: ["etapa1", "gold", "detail", id],
    queryFn: () => fetchGoldCompanyById(String(id)),
    enabled: Boolean(id),
  });
}

export function useGoldCompanyJourney(id?: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["etapa1", "gold", "journey", id, limit, offset],
    queryFn: () => fetchGoldCompanyJourney(String(id), limit, offset),
    enabled: Boolean(id),
  });
}

export function useDashboardDailyStats(params: DailyStatsParams = {}) {
  return useQuery({
    queryKey: ["etapa1", "dashboard", "daily-stats", params],
    queryFn: () => fetchDashboardDailyStats(params),
  });
}

export function usePatchGoldCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof patchGoldCompany>[1];
    }) => patchGoldCompany(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "gold"] });
    },
  });
}

export function useTransitionGoldCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof transitionGoldCompany>[1];
    }) => transitionGoldCompany(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "gold"] });
    },
  });
}

export function useApprovals(params: ApprovalListParams = {}) {
  return useQuery({
    queryKey: ["etapa1", "approvals", params],
    queryFn: () => fetchApprovals(params),
  });
}

export function useApprovalDetail(id?: string) {
  return useQuery({
    queryKey: ["etapa1", "approvals", "detail", id],
    queryFn: () => fetchApprovalById(String(id)),
    enabled: Boolean(id),
  });
}

export function useApprovalStats() {
  return useQuery({ queryKey: ["etapa1", "approvals", "stats"], queryFn: fetchApprovalStats });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "approve" | "reject" | "merge" | "skip";
    }) => decideApproval(id, decision),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "approvals"] });
    },
  });
}

export function useAssignApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => assignApproval(id, userId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "approvals"] });
    },
  });
}

export function useQueueStatuses() {
  return useQuery({
    queryKey: ["etapa1", "queues"],
    queryFn: fetchQueueStatuses,
    refetchInterval: 15000,
  });
}

export function useQueueStatusByName(name?: string) {
  return useQuery({
    queryKey: ["etapa1", "queues", "detail", name],
    queryFn: () => fetchQueueStatusByName(String(name)),
    enabled: Boolean(name),
    refetchInterval: 15000,
  });
}

export function usePauseQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pauseQueue,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "queues"] });
    },
  });
}

export function useResumeQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resumeQueue,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "queues"] });
    },
  });
}

export function useDedupCandidates(params: DedupCandidatesParams = {}) {
  return useQuery({
    queryKey: ["etapa1", "silver", "dedup-candidates", params],
    queryFn: () => fetchDedupCandidates(params),
  });
}

export function useDecideDedup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      masterCompanyId,
    }: {
      id: string;
      decision: "merge" | "reject" | "skip";
      masterCompanyId?: string;
    }) => decideDedupPair(id, decision, masterCompanyId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["etapa1", "silver", "dedup-candidates"] });
    },
  });
}
