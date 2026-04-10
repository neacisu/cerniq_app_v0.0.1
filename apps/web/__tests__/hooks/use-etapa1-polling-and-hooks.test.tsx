/**
 * Funcții pure de polling + smoke renderHook pe hook-uri use-etapa1 (API mock-uit).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api.js";

const { mk, obj, tokenState } = vi.hoisted(() => {
  const ts = { token: "tok" as string | null };
  /** Răspuns listă — `useImports` folosește `data` ca array în refetchInterval. */
  const mockFn = () =>
    vi.fn(() => Promise.resolve({ success: true as const, data: [] as unknown[] }));
  const mockObj = (data: unknown) => vi.fn(() => Promise.resolve({ success: true as const, data }));
  return { mk: mockFn, obj: mockObj, tokenState: ts };
});

import {
  getImportControlPollingInterval,
  shouldRetryEtapa1PollingQuery,
  useDashboardStats,
  useDashboardActivity,
  useImports,
  useImportDetail,
  useImportRows,
  useImportReprocessErrors,
  useImportEntities,
  useImportQuarantine,
  useUploadImport,
  useCancelImport,
  useAnafEnrichImport,
  useBronzeContacts,
  useBronzeContactDetail,
  useReprocessBronze,
  usePromoteJobStatus,
  useResumePromoteJob,
  useResumeImportReprocessErrors,
  useImportPipelineStatus,
  useImportRuntimeTopology,
  useImportControl,
  usePauseImportsGlobal,
  useResumeImportsGlobal,
  usePauseImportBatch,
  useResumeImportBatch,
  usePauseImportWorker,
  useResumeImportWorker,
  useDeleteImportBatch,
  useSilverCompanies,
  useSilverCompanyDetail,
  useSilverEnrichmentLog,
  useTriggerSilverEnrich,
  useTriggerSilverPromote,
  useGoldCompanies,
  useGoldCompanyDetail,
  useGoldCompanyJourney,
  useDashboardDailyStats,
  usePatchGoldCompany,
  useTransitionGoldCompany,
  useApprovals,
  useApprovalDetail,
  useApprovalStats,
  useDecideApproval,
  useAssignApproval,
  useEscalateApproval,
  useQueueStatuses,
  useQueueStatusByName,
  usePauseQueue,
  useResumeQueue,
  useDedupCandidates,
  useDecideDedup,
  useMappingTargets,
  useSaveImportMapping,
  useImportJobLogs,
} from "@/hooks/use-etapa1.js";

vi.mock("@/providers/auth-provider.js", () => ({
  useAuth: () => ({
    token: tokenState.token,
    user: null,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setAuth: vi.fn(),
    getAuthHeader: () => ({}),
  }),
}));

vi.mock("@/lib/etapa1-api.js", () => ({
  anafEnrichImport: mk(),
  assignApproval: mk(),
  cancelImport: mk(),
  decideApproval: mk(),
  escalateApproval: mk(),
  decideDedupPair: mk(),
  fetchApprovals: mk(),
  fetchApprovalById: mk(),
  fetchApprovalStats: mk(),
  fetchBronzeContactById: mk(),
  fetchBronzeContacts: mk(),
  fetchDashboardActivity: mk(),
  fetchDashboardDailyStats: mk(),
  fetchDashboardStats: mk(),
  fetchDedupCandidates: mk(),
  fetchGoldCompanyById: mk(),
  fetchGoldCompanyJourney: mk(),
  fetchGoldCompanies: mk(),
  fetchImportControl: mk(),
  fetchImportById: obj({ status: "completed" }),
  fetchImportEntities: mk(),
  fetchImportReprocessErrors: mk(),
  fetchImportQuarantine: mk(),
  fetchImportJobLogs: mk(),
  fetchImportRows: mk(),
  fetchImports: mk(),
  fetchImportPipelineStatus: obj({
    reprocessJob: { state: "completed" },
    promotionQueue: { waiting: 0, active: 0 },
  }),
  fetchImportRuntimeTopology: obj({ workers: [], sessions: [] }),
  fetchPromoteJobStatus: obj({ state: "completed" }),
  deleteImportBatch: mk(),
  pauseImportBatch: mk(),
  pauseImportWorker: mk(),
  pauseImportsGlobal: mk(),
  resumeImportReprocessErrors: mk(),
  resumeImportsGlobal: mk(),
  resumePromoteJob: mk(),
  fetchQueueStatusByName: mk(),
  fetchQueueStatuses: mk(),
  fetchSilverCompanies: mk(),
  fetchSilverCompanyById: mk(),
  fetchSilverEnrichmentLog: mk(),
  fetchMappingTargets: mk(),
  saveImportMapping: mk(),
  patchGoldCompany: mk(),
  pauseQueue: mk(),
  reprocessBronzeContact: mk(),
  resumeImportBatchScoped: mk(),
  resumeQueue: mk(),
  resumeImportWorkerScoped: mk(),
  transitionGoldCompany: mk(),
  triggerSilverEnrich: mk(),
  triggerSilverPromote: mk(),
  uploadImport: obj({ id: "up1" }),
}));

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("use-etapa1 — polling helpers", () => {
  it("getImportControlPollingInterval: 401 → false", () => {
    expect(getImportControlPollingInterval(new ApiError("u", 401), 1)).toBe(false);
  });

  it("getImportControlPollingInterval: 502 → backoff", () => {
    const ms = getImportControlPollingInterval(new ApiError("b", 502), 2);
    expect(ms).toBeGreaterThan(3000);
    expect(ms).toBeLessThanOrEqual(60_000);
  });

  it("getImportControlPollingInterval: altceva → 3000", () => {
    expect(getImportControlPollingInterval(new Error("x"), 0)).toBe(3000);
  });

  it("shouldRetryEtapa1PollingQuery", () => {
    expect(shouldRetryEtapa1PollingQuery(0, new ApiError("u", 401))).toBe(false);
    expect(shouldRetryEtapa1PollingQuery(0, new ApiError("b", 503))).toBe(false);
    expect(shouldRetryEtapa1PollingQuery(2, new Error("x"))).toBe(true);
    expect(shouldRetryEtapa1PollingQuery(4, new Error("x"))).toBe(false);
  });
});

describe("use-etapa1 — smoke hooks (API mock)", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    tokenState.token = "tok";
  });

  const smoke = (name: string, useHook: () => unknown) => {
    it(name, async () => {
      renderHook(useHook, { wrapper: wrapper(qc) });
      await waitFor(() => {
        expect(qc.isFetching()).toBe(0);
      });
    });
  };

  smoke("useDashboardStats", () => useDashboardStats());
  smoke("useDashboardActivity", () => useDashboardActivity(10));
  smoke("useImports", () => useImports({ limit: 10 }));
  smoke("useImportDetail", () => useImportDetail("id1"));
  smoke("useImportRows", () => useImportRows("id1"));
  smoke("useImportReprocessErrors", () => useImportReprocessErrors("id1"));
  smoke("useImportEntities", () => useImportEntities("id1"));
  smoke("useImportQuarantine", () => useImportQuarantine("id1", 10, 0, "s1"));
  smoke("usePromoteJobStatus", () => usePromoteJobStatus("b1"));
  smoke("useImportPipelineStatus", () => useImportPipelineStatus("b1"));
  smoke("useImportRuntimeTopology", () => useImportRuntimeTopology("b1", { isActive: true }));
  smoke("useImportControl", () => useImportControl());
  smoke("useBronzeContacts", () => useBronzeContacts({}));
  smoke("useBronzeContactDetail", () => useBronzeContactDetail("c1"));
  smoke("useSilverCompanies", () => useSilverCompanies({}));
  smoke("useSilverCompanyDetail", () => useSilverCompanyDetail("s1"));
  smoke("useSilverEnrichmentLog", () => useSilverEnrichmentLog("e1"));
  smoke("useGoldCompanies", () => useGoldCompanies({}));
  smoke("useGoldCompanyDetail", () => useGoldCompanyDetail("g1"));
  smoke("useGoldCompanyJourney", () => useGoldCompanyJourney("g1"));
  smoke("useDashboardDailyStats", () => useDashboardDailyStats({}));
  smoke("useApprovals", () => useApprovals({}));
  smoke("useApprovalDetail", () => useApprovalDetail("a1"));
  smoke("useApprovalStats", () => useApprovalStats());
  smoke("useQueueStatuses", () => useQueueStatuses());
  smoke("useQueueStatusByName", () => useQueueStatusByName("q1"));
  smoke("useDedupCandidates", () => useDedupCandidates({}));
  smoke("useMappingTargets", () => useMappingTargets());
  smoke("useImportJobLogs", () => useImportJobLogs("batch1", { isActive: true }));

  it("useImportJobLogs fără batchId: nu pornește fetch", () => {
    const { result } = renderHook(() => useImportJobLogs(undefined), { wrapper: wrapper(qc) });
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isFetched).toBe(false);
  });

  it("useImportControl dezactivat fără token", async () => {
    tokenState.token = null;
    const { result } = renderHook(() => useImportControl(), { wrapper: wrapper(qc) });
    expect(result.current.fetchStatus).toMatch(/idle|pending/);
    expect(result.current.isFetched).toBe(false);
  });

  it("mutations: useUploadImport invalidare", async () => {
    const { result } = renderHook(() => useUploadImport(), { wrapper: wrapper(qc) });
    const file = new File(["x"], "a.csv", { type: "text/csv" });
    await result.current.mutateAsync({ file });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("useSaveImportMapping aruncă fără importId", async () => {
    const { result } = renderHook(() => useSaveImportMapping(undefined), { wrapper: wrapper(qc) });
    await expect(result.current.mutateAsync({ col: "x" })).rejects.toThrow(/Missing importId/);
  });

  const mutSmoke = (
    name: string,
    factory: () => { mutateAsync: (a: never) => Promise<unknown> },
    arg: never,
  ) => {
    it(name, async () => {
      const { result } = renderHook(factory, { wrapper: wrapper(qc) });
      await result.current.mutateAsync(arg);
    });
  };

  mutSmoke("useCancelImport", () => useCancelImport(), "imp1" as never);
  mutSmoke("useAnafEnrichImport", () => useAnafEnrichImport(), "imp1" as never);
  mutSmoke("useReprocessBronze", () => useReprocessBronze(), "b1" as never);
  mutSmoke("useResumePromoteJob", () => useResumePromoteJob(), "b1" as never);
  mutSmoke("useResumeImportReprocessErrors", () => useResumeImportReprocessErrors(), "b1" as never);
  mutSmoke("usePauseImportsGlobal", () => usePauseImportsGlobal(), undefined as never);
  mutSmoke("useResumeImportsGlobal", () => useResumeImportsGlobal(), "resume" as never);
  mutSmoke("usePauseImportBatch", () => usePauseImportBatch(), "b1" as never);
  mutSmoke("useResumeImportBatch", () => useResumeImportBatch(), {
    batchId: "b1",
    mode: "resume",
  } as never);
  mutSmoke("usePauseImportWorker", () => usePauseImportWorker(), {
    batchId: "b1",
    workerName: "w",
  } as never);
  mutSmoke("useResumeImportWorker", () => useResumeImportWorker(), {
    batchId: "b1",
    workerName: "w",
  } as never);
  mutSmoke("useDeleteImportBatch", () => useDeleteImportBatch(), "b1" as never);
  mutSmoke("useTriggerSilverEnrich", () => useTriggerSilverEnrich(), "s1" as never);
  mutSmoke("useTriggerSilverPromote", () => useTriggerSilverPromote(), "s1" as never);
  mutSmoke("usePatchGoldCompany", () => usePatchGoldCompany(), {
    id: "g1",
    payload: { doNotContact: false },
  } as never);
  mutSmoke("useTransitionGoldCompany", () => useTransitionGoldCompany(), {
    id: "g1",
    payload: { toState: "ENGAGED" },
  } as never);
  mutSmoke("useDecideApproval", () => useDecideApproval(), {
    id: "a1",
    decision: "approve",
  } as never);
  mutSmoke("useAssignApproval", () => useAssignApproval(), { id: "a1", userId: "u1" } as never);
  mutSmoke("useEscalateApproval", () => useEscalateApproval(), { id: "a1", reason: "r" } as never);
  mutSmoke("usePauseQueue", () => usePauseQueue(), "q1" as never);
  mutSmoke("useResumeQueue", () => useResumeQueue(), "q1" as never);
  mutSmoke("useDecideDedup", () => useDecideDedup(), { id: "d1", decision: "merge" } as never);
  it("useSaveImportMapping cu importId", async () => {
    const { result } = renderHook(() => useSaveImportMapping("i1"), { wrapper: wrapper(qc) });
    await result.current.mutateAsync({ x: "y" });
  });
});
