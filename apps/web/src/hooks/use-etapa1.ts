import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ApprovalListParams,
  type BronzeContactsParams,
  type DailyStatsParams,
  type GoldCompaniesParams,
  type ImportListParams,
  type SilverCompaniesParams,
  type DedupCandidatesParams,
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
  fetchImports,
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
  });
}

export function useImportDetail(id?: string) {
  return useQuery({
    queryKey: ["etapa1", "imports", "detail", id],
    queryFn: () => fetchImportById(String(id)),
    enabled: Boolean(id),
  });
}

export function useUploadImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, config }: { file: File; config?: Parameters<typeof uploadImport>[1] }) =>
      uploadImport(file, config),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["etapa1", "imports"] }),
  });
}

export function useCancelImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelImport,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["etapa1", "imports"] }),
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["etapa1", "bronze"] }),
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["etapa1", "silver"] }),
  });
}

export function useTriggerSilverPromote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerSilverPromote,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["etapa1", "silver"] }),
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["etapa1", "gold"] }),
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["etapa1", "gold"] }),
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["etapa1", "approvals"] }),
  });
}

export function useAssignApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => assignApproval(id, userId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["etapa1", "approvals"] }),
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["etapa1", "queues"] }),
  });
}

export function useResumeQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resumeQueue,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["etapa1", "queues"] }),
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
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["etapa1", "silver", "dedup-candidates"] }),
  });
}
