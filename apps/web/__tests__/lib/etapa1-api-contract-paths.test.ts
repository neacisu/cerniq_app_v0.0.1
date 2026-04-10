/**
 * Contract: funcțiile din etapa1-api trimit către prefixele /api/v1/* așteptate (fără MSW în aceste unități).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/api.js";
import {
  fetchTemplateColumns,
  fetchImportById,
  fetchImportRows,
  fetchImportReprocessErrors,
  resumeImportReprocessErrors,
  fetchImportEntities,
  cancelImport,
  retryImport,
  fetchMappingTargets,
  fetchImportHeaders,
  retryImportWithMapping,
  saveImportMapping,
  rePromoteImport,
  fetchPromoteJobStatus,
  fetchImportPipelineStatus,
  fetchImportRuntimeTopology,
  fetchImportControl,
  pauseImportsGlobal,
  resumeImportsGlobal,
  pauseImportBatch,
  resumeImportBatch,
  resumeImportBatchScoped,
  pauseImportWorker,
  resumeImportWorker,
  resumeImportWorkerScoped,
  deleteImportBatch,
  resumePromoteJob,
  anafEnrichImport,
  fetchBronzeContacts,
  fetchBronzeContactById,
  reprocessBronzeContact,
  fetchSilverCompanies,
  fetchSilverCompanyById,
  triggerSilverEnrich,
  triggerSilverPromote,
  fetchGoldCompanies,
  fetchGoldCompanyById,
  patchGoldCompany,
  transitionGoldCompany,
  fetchSilverEnrichmentLog,
  fetchGoldCompanyJourney,
  fetchApprovals,
  fetchApprovalById,
  fetchApprovalStats,
  decideApproval,
  assignApproval,
  escalateApproval,
  fetchQueueStatuses,
  fetchQueueStatusByName,
  pauseQueue,
  resumeQueue,
  fetchDedupCandidates,
  decideDedupPair,
  fetchImportJobLogs,
  fetchImportQuarantine,
} from "@/lib/etapa1-api.js";

describe("etapa1-api — căi contract (importuri, bronze/silver/gold, approvals, cozi, dedup)", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: [] });
    vi.spyOn(api, "post").mockResolvedValue({ success: true, data: {} });
    vi.spyOn(api, "put").mockResolvedValue({ success: true, data: {} });
    vi.spyOn(api, "patch").mockResolvedValue({ success: true, data: {} });
    vi.spyOn(api, "delete").mockResolvedValue({ success: true, data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchTemplateColumns → GET /api/v1/imports/template/columns", async () => {
    await fetchTemplateColumns();
    expect(api.get).toHaveBeenCalledWith("/api/v1/imports/template/columns");
  });

  it("fetchImportById → GET /api/v1/imports/:id", async () => {
    await fetchImportById("b1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/imports/b1");
  });

  it("fetchImportRows → query params", async () => {
    await fetchImportRows("b1", { limit: 10, identityStatus: "unresolved" });
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/imports\/b1\/rows\?/));
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain("identityStatus=unresolved");
  });

  it("fetchImportReprocessErrors", async () => {
    await fetchImportReprocessErrors("b1", { limit: 5 });
    expect(api.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/imports\/b1\/reprocess-errors\?/),
    );
  });

  it("resumeImportReprocessErrors → POST", async () => {
    await resumeImportReprocessErrors("b1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/reprocess-errors/resume");
  });

  it("fetchImportEntities", async () => {
    await fetchImportEntities("b1");
    expect(api.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/imports\/b1\/entities\?/),
    );
  });

  it("cancelImport / retryImport", async () => {
    await cancelImport("b1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/cancel");
    await retryImport("b1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/retry");
  });

  it("fetchMappingTargets", async () => {
    await fetchMappingTargets();
    expect(api.get).toHaveBeenCalledWith("/api/v1/imports/mapping-targets");
  });

  it("fetchImportHeaders", async () => {
    await fetchImportHeaders("b1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/imports/b1/headers");
  });

  it("retryImportWithMapping / saveImportMapping", async () => {
    await retryImportWithMapping("b1", { a: "b" });
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/retry", { mapping: { a: "b" } });
    await saveImportMapping("b1", { x: "y" });
    expect(api.put).toHaveBeenCalledWith("/api/v1/imports/b1/mapping", { mapping: { x: "y" } });
  });

  it("rePromoteImport / fetchPromoteJobStatus", async () => {
    await rePromoteImport("b1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/re-promote");
    await fetchPromoteJobStatus("b1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/imports/b1/promote-job-status");
  });

  it("fetchImportPipelineStatus cu session", async () => {
    await fetchImportPipelineStatus("b1", { session: "s1" });
    expect(api.get).toHaveBeenCalledWith("/api/v1/imports/b1/pipeline-status?session=s1");
  });

  it("fetchImportRuntimeTopology", async () => {
    await fetchImportRuntimeTopology("b1", { worker: "w1" });
    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/imports/b1/runtime-topology?"),
    );
    expect(vi.mocked(api.get).mock.calls.at(-1)?.[0]).toContain("worker=w1");
  });

  it("fetchImportControl / pause / resume global", async () => {
    await fetchImportControl();
    expect(api.get).toHaveBeenCalledWith("/api/v1/imports/control");
    await pauseImportsGlobal();
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/control/pause");
    await resumeImportsGlobal("recover");
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/control/resume", { mode: "recover" });
  });

  it("pause/resume batch", async () => {
    await pauseImportBatch("b1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/pause");
    await resumeImportBatch("b1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/resume", {});
    await resumeImportBatchScoped("b1", { mode: "resume", sessionId: "z" });
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/resume", {
      mode: "resume",
      sessionId: "z",
    });
  });

  it("pause/resume worker (encodeURIComponent)", async () => {
    await pauseImportWorker("b1", "w/x");
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/workers/w%2Fx/pause");
    await resumeImportWorker("b1", "w/x", "recover");
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/workers/w%2Fx/resume", {
      mode: "recover",
    });
    await resumeImportWorkerScoped("b1", "w", { allSessions: true });
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/workers/w/resume", {
      allSessions: true,
    });
  });

  it("deleteImportBatch / resumePromoteJob / anafEnrichImport", async () => {
    await deleteImportBatch("b1");
    expect(api.delete).toHaveBeenCalledWith("/api/v1/imports/b1");
    await resumePromoteJob("b1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/resume-promote");
    await anafEnrichImport("b1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/imports/b1/anaf-enrich");
  });

  it("bronze contacts", async () => {
    await fetchBronzeContacts({ search: "x" });
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/bronze\/contacts\?/));
    await fetchBronzeContactById("c1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/bronze/contacts/c1");
    await reprocessBronzeContact("c1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/bronze/contacts/c1/reprocess");
  });

  it("silver", async () => {
    await fetchSilverCompanies({ judet: "AB" });
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("judet=AB"));
    await fetchSilverCompanyById("s1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/silver/companies/s1");
    await triggerSilverEnrich("s1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/silver/companies/s1/enrich", { force: true });
    await triggerSilverPromote("s1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/silver/companies/s1/promote", { force: true });
  });

  it("gold", async () => {
    await fetchGoldCompanies({ notInOutreach: true });
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("notInOutreach=true"));
    await fetchGoldCompanyById("g1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/gold/companies/g1");
    await patchGoldCompany("g1", { doNotContact: true });
    expect(api.patch).toHaveBeenCalledWith("/api/v1/gold/companies/g1", { doNotContact: true });
    await transitionGoldCompany("g1", { toState: "COLD" });
    expect(api.post).toHaveBeenCalledWith("/api/v1/gold/companies/g1/transition", {
      toState: "COLD",
    });
  });

  it("silver enrichment log / gold journey", async () => {
    await fetchSilverEnrichmentLog("e1", 10, 2);
    expect(api.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/silver\/enrichment-log\?/),
    );
    expect(vi.mocked(api.get).mock.calls.at(-1)?.[0]).toContain("entityId=e1");
    await fetchGoldCompanyJourney("g1");
    expect(api.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/gold\/companies\/g1\/journey\?/),
    );
  });

  it("approvals", async () => {
    await fetchApprovals({ approvalType: "dedup_review" });
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("approvalType=dedup_review"));
    await fetchApprovalById("a1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/enrichment/approvals/a1");
    await fetchApprovalStats();
    expect(api.get).toHaveBeenCalledWith("/api/v1/enrichment/approvals/stats");
    await decideApproval("a1", "approve");
    expect(api.post).toHaveBeenCalledWith("/api/v1/enrichment/approvals/a1/decide", {
      decision: "approve",
    });
    await assignApproval("a1", "u1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/enrichment/approvals/a1/assign", {
      userId: "u1",
    });
    await escalateApproval("a1", "because", "boss");
    expect(api.post).toHaveBeenCalledWith("/api/v1/enrichment/approvals/a1/escalate", {
      reason: "because",
      escalateTo: "boss",
    });
  });

  it("queues", async () => {
    await fetchQueueStatuses();
    expect(api.get).toHaveBeenCalledWith("/api/v1/enrichment/queues");
    await fetchQueueStatusByName("q1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/enrichment/queues/q1");
    await pauseQueue("q1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/enrichment/queues/q1/pause");
    await resumeQueue("q1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/enrichment/queues/q1/resume");
  });

  it("dedup", async () => {
    await fetchDedupCandidates({ status: "pending" });
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("status=pending"));
    await decideDedupPair("d1", "merge", "master-id");
    expect(api.post).toHaveBeenCalledWith("/api/v1/silver/dedup-candidates/d1/decide", {
      decision: "merge",
      masterCompanyId: "master-id",
    });
  });

  it("job logs / quarantine", async () => {
    await fetchImportJobLogs("batch1", { level: "error", limit: 50 });
    expect(api.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/imports\/batch1\/job-logs\?/),
    );
    expect(vi.mocked(api.get).mock.calls.at(-1)?.[0]).toContain("level=error");
    await fetchImportQuarantine("batch1", { reasonCode: "X" });
    expect(api.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/imports\/batch1\/quarantine\?/),
    );
    expect(vi.mocked(api.get).mock.calls.at(-1)?.[0]).toContain("reasonCode=X");
  });
});
