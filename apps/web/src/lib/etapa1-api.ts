import { api } from "./api.js";

type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  meta?: { total?: number; limit?: number; offset?: number };
};

type ApiObjectResponse<T> = { success: boolean; data: T };

type SortDir = "asc" | "desc";

export type ImportListParams = {
  limit?: number;
  offset?: number;
  status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
  sourceType?: "csv_import" | "webhook" | "scrape" | "manual" | "api" | "excel_import";
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "updatedAt";
  sortDir?: SortDir;
};

export type ImportRowsParams = {
  limit?: number;
  offset?: number;
  identityStatus?:
    | "unresolved"
    | "resolved"
    | "duplicate_source"
    | "identity_conflict"
    | "insufficient_identifiers";
};

export type ImportReprocessErrorsParams = {
  limit?: number;
  offset?: number;
};

export type BronzeContactsParams = {
  limit?: number;
  offset?: number;
  status?: "pending" | "processing" | "promoted" | "rejected" | "error";
  sourceType?: "csv_import" | "webhook" | "scrape" | "manual" | "api" | "excel_import";
  search?: string;
  batchId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "updatedAt";
  sortDir?: SortDir;
};

export type SilverCompaniesParams = {
  limit?: number;
  offset?: number;
  search?: string;
  enrichmentStatus?: "pending" | "in_progress" | "complete" | "partial" | "failed";
  promotionStatus?: "eligible" | "review_required" | "blocked" | "promoted";
  statusFirma?: "ACTIVA" | "INACTIVA" | "DIZOLVARE" | "RADIATA" | "INSOLVENTA";
  judet?: string;
  minQuality?: number;
  maxQuality?: number;
  sortBy?: "updatedAt" | "totalQualityScore" | "createdAt";
  sortDir?: SortDir;
};

export type GoldCompaniesParams = {
  search?: string;
  currentState?: string[];
  judetCod?: string;
  assignedTo?: string;
  unassigned?: boolean;
  doNotContact?: boolean;
  /** Exclude companii care au deja rând în Etapa 2 (`outreach.lead_journey`). */
  notInOutreach?: boolean;
  minLeadScore?: number;
  maxLeadScore?: number;
  isAgricultural?: boolean;
  sortBy?: "updatedAt" | "leadScore" | "createdAt";
  sortDir?: SortDir;
  limit?: number;
  offset?: number;
};

export type ApprovalListParams = {
  statuses?: string[];
  assignedTo?: string;
  unassigned?: boolean;
  approvalType?:
    | "dedup_review"
    | "quality_review"
    | "identity_conflict"
    | "ai_structuring_review"
    | "ai_merge_review"
    | "low_confidence_review"
    | "data_anomaly"
    | "manual_verification"
    | "error_review";
  priority?: "critical" | "high" | "normal" | "low";
  pipelineStage?: string;
  overdue?: boolean;
  sortBy?: "dueAt" | "createdAt" | "priorityLevel";
  sortDir?: SortDir;
  limit?: number;
};

type QueryParamValue = string | number | boolean | string[] | number[] | undefined | null;

function appendParams(params: URLSearchParams, values: Record<string, QueryParamValue>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      params.set(key, value.join(","));
      continue;
    }
    params.set(key, String(value));
  }
}

export async function fetchDashboardStats() {
  return api.get<ApiObjectResponse<Record<string, unknown>>>("/api/v1/dashboard/stats");
}

export type DashboardActivityItem = {
  id: string;
  type: string;
  timestamp: string;
  message: string;
  severity: string | null;
};

export type DailyStatRow = {
  id: string;
  tenantId: string;
  statDate: string;
  pipelineStage: string;
  bronzeTotal: number;
  silverTotal: number;
  goldTotal: number;
  avgQualityScore: string | null;
  avgLeadScore: string | null;
  hitlPending: number;
  hitlCompleted: number;
  enrichmentJobsCompleted: number;
  enrichmentJobsFailed: number;
  createdAt: string;
};

export async function fetchDashboardActivity(limit = 20) {
  return api.get<ApiObjectResponse<DashboardActivityItem[]>>(
    `/api/v1/dashboard/activity?limit=${limit}`,
  );
}

export type TemplateColumn = {
  header: string;
  required: boolean;
  description: string;
  example: string;
  autoMapped: boolean;
};

export async function fetchTemplateColumns() {
  return api.get<{ success: boolean; data: TemplateColumn[] }>("/api/v1/imports/template/columns");
}

export async function downloadImportTemplate(format: "csv" | "xlsx" = "csv"): Promise<void> {
  const { getApiBase } = await import("./api-url.js");
  const base = getApiBase();
  const hasWindow = typeof globalThis.window === "object";
  const token = hasWindow ? globalThis.localStorage.getItem("cerniq_token") : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base.replace(/\/$/, "")}/api/v1/imports/template?format=${format}`, {
    headers,
  });
  if (!res.ok) throw new Error(`Descărcare template eșuată: ${res.status}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template_import_cerniq.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function fetchImports(params: ImportListParams = {}) {
  const query = new URLSearchParams();
  appendParams(query, {
    limit: params.limit ?? 25,
    offset: params.offset ?? 0,
    status: params.status,
    sourceType: params.sourceType,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });
  return api.get<ApiListResponse<Record<string, unknown>>>(`/api/v1/imports?${query}`);
}

export async function fetchImportById(id: string) {
  return api.get<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/imports/${id}`);
}

export async function fetchImportRows(id: string, params: ImportRowsParams = {}) {
  const query = new URLSearchParams();
  appendParams(query, {
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
    identityStatus: params.identityStatus,
  });
  return api.get<ApiListResponse<Record<string, unknown>>>(`/api/v1/imports/${id}/rows?${query}`);
}

export async function fetchImportReprocessErrors(
  id: string,
  params: ImportReprocessErrorsParams = {},
) {
  const query = new URLSearchParams();
  appendParams(query, {
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
  });
  return api.get<ApiListResponse<Record<string, unknown>>>(
    `/api/v1/imports/${id}/reprocess-errors?${query}`,
  );
}

export async function resumeImportReprocessErrors(id: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/imports/${id}/reprocess-errors/resume`,
  );
}

export async function fetchImportEntities(
  id: string,
  params: { limit?: number; offset?: number } = {},
) {
  const query = new URLSearchParams();
  appendParams(query, {
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
  });
  return api.get<ApiListResponse<Record<string, unknown>>>(
    `/api/v1/imports/${id}/entities?${query}`,
  );
}

export async function uploadImport(
  file: File,
  config?: {
    mapping?: Record<string, string>;
    hasHeader?: boolean;
    encoding?: "utf-8" | "iso-8859-2" | "win-1250";
    delimiter?: "," | ";" | "\t";
    sheetName?: string;
    sourceType?: "csv_import" | "webhook" | "scrape" | "manual" | "api" | "excel_import";
  },
) {
  const form = new FormData();
  form.append("file", file);
  if (config?.mapping) form.append("mapping", JSON.stringify(config.mapping));
  if (config?.hasHeader !== undefined) form.append("hasHeader", String(config.hasHeader));
  if (config?.encoding) form.append("encoding", config.encoding);
  if (config?.delimiter) form.append("delimiter", config.delimiter);
  if (config?.sheetName) form.append("sheetName", config.sheetName);
  if (config?.sourceType) form.append("sourceType", config.sourceType);
  return api.post<ApiObjectResponse<Record<string, unknown>>>("/api/v1/imports", form);
}

export async function cancelImport(id: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/imports/${id}/cancel`);
}

export async function retryImport(id: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/imports/${id}/retry`);
}

export type MappingTarget = { key: string; label: string; aliases: string[] };

export async function fetchMappingTargets() {
  return api.get<ApiListResponse<MappingTarget>>("/api/v1/imports/mapping-targets");
}

export type ImportHeadersResponse = {
  sheets: Array<{ sheetName: string; headers: string[] }>;
  autoMapping: Record<string, string>;
  savedMapping: Record<string, string> | null;
};

export async function fetchImportHeaders(id: string) {
  return api.get<ApiObjectResponse<ImportHeadersResponse>>(`/api/v1/imports/${id}/headers`);
}

export async function retryImportWithMapping(id: string, mapping: Record<string, string>) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/imports/${id}/retry`, {
    mapping,
  });
}

export async function saveImportMapping(id: string, mapping: Record<string, string>) {
  return api.put<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/imports/${id}/mapping`, {
    mapping,
  });
}

export async function rePromoteImport(id: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/imports/${id}/re-promote`);
}

export type PromoteJobStatus = {
  state:
    | "none"
    | "waiting"
    | "backlogged"
    | "active"
    | "stale"
    | "failed"
    | "completed"
    | "delayed"
    | "prioritized"
    | "stalled"
    | "unknown";
  isStale?: boolean;
  isBacklogged?: boolean;
  jobId?: string | null;
  attemptsMade?: number;
  maxAttempts?: number;
  failedReason?: string | null;
  stacktrace?: string | null;
  progress?: number | null;
  timestamp?: string | null;
  processedOn?: string | null;
  finishedOn?: string | null;
  waitingJobs?: number | null;
  dbStatus?: string;
};

export async function fetchPromoteJobStatus(id: string) {
  return api.get<ApiObjectResponse<PromoteJobStatus>>(`/api/v1/imports/${id}/promote-job-status`);
}

export type ImportPipelineStatus = {
  attempts?: ImportAttemptSummary[];
  batchId: string;
  batchStatus: string;
  selectedRuntimeSession?: ImportRuntimeSessionSummary | null;
  selectedAttemptSummary?: ImportAttemptSummary | null;
  latestAttemptSummary?: ImportAttemptSummary | null;
  historicalSummary?: Record<string, number> | null;
  quarantineSummary?: ImportQuarantineSummary | null;
  selectedQuarantineSummary?: ImportQuarantineSummary | null;
  totalRows: number;
  successRows: number;
  reprocessJob: {
    state: string;
    isStale: boolean;
    isBacklogged: boolean;
    jobId: string | null;
    attemptsMade: number;
    maxAttempts: number;
    failedReason: string | null;
    stacktrace: string | null;
    processedOn: string | null;
    finishedOn: string | null;
    lastProgressAt: string | null;
    dbStatus: string;
    phase: string | null;
    processed: number;
    total: number;
    counterDrift: boolean;
    resolved: number;
    duplicateSource: number;
    identityConflict: number;
    insufficientIdentifiers: number;
    failedContacts: number;
    promotionQueued: number;
    startedAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
    sessionStartedAt: string | null;
    mode: string | null;
  } | null;
  promotionQueue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  globalControl?: ImportGlobalControlState | null;
  batchControl?: ImportBatchControlState | null;
  workerControls?: ImportWorkerControlState[];
  anafProgress?: ImportAnafProgress | null;
  promotionMetrics?: ImportPromotionMetrics | null;
  legacyTelemetry?: boolean;
};

export type ImportAttemptSummary = {
  id: string;
  kind: string;
  status: string;
  label: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  pausedAt: string | null;
  lastHeartbeatAt: string | null;
  updatedAt: string | null;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  duplicateRows: number;
  quarantineRows: number;
};

export type ImportRuntimeSessionSummary = {
  id: string;
  kind: string;
  status: string;
  label: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  pausedAt: string | null;
  lastHeartbeatAt: string | null;
  updatedAt: string | null;
};

export type ImportQuarantineSummary = {
  totalRows: number;
  disallowedControlCharacterRows: number;
  sourceIdentifierHashConflictRows: number;
};

export async function fetchImportPipelineStatus(
  id: string,
  params: {
    session?: string;
  } = {},
) {
  const query = new URLSearchParams();
  appendParams(query, params);
  return api.get<ApiObjectResponse<ImportPipelineStatus>>(
    `/api/v1/imports/${id}/pipeline-status?${query}`,
  );
}

export type ImportRuntimeJob = {
  key: string;
  source: "bullmq" | "job_logs" | "silver_logs" | "runtime" | "merged";
  state: string;
  workerName: string;
  queueName: string;
  jobId: string | null;
  bronzeContactId: string | null;
  entityId: string | null;
  entityType: string | null;
  correlationId: string | null;
  level: JobLogLevel | null;
  step: string | null;
  message: string | null;
  progress: number | null;
  attemptsMade: number;
  maxAttempts: number;
  failedReason: string | null;
  createdAt: string | null;
  processedOn: string | null;
  finishedOn: string | null;
  lastEventAt: string | null;
  durationMs: number | null;
};

export type ImportRuntimeWorker = {
  workerName: string;
  label: string;
  stage: string;
  queueName: string;
  description: string;
  control?: {
    globalPaused?: boolean;
    batchPaused?: boolean;
    workerPaused?: boolean;
  };
  counts: {
    waiting: number;
    active: number;
    delayed: number;
    prioritized: number;
    failedLive: number;
    observedCompleted: number;
    observedWarnings: number;
    observedErrors: number;
    observedLogs: number;
    observedJobs: number;
    pausedJobs?: number;
    skippedJobs?: number;
    totalUnits?: number;
    processedUnits?: number;
    successUnits?: number;
    failedUnits?: number;
    insertedUnits?: number;
    updatedUnits?: number;
  };
  jobs: ImportRuntimeJob[];
};

export type ImportGlobalControlState = {
  globalPaused: boolean;
  pausedAt: string | null;
  pausedBy: string | null;
  resumeRequestedAt: string | null;
  version: number;
};

export type ImportBatchControlState = {
  batchPaused: boolean;
  pausedAt: string | null;
  pausedBy: string | null;
  resumeRequestedAt: string | null;
  workerPauses: Record<string, boolean>;
  deleteRequested: boolean;
  deleteRequestedAt: string | null;
  deleteRequestedBy: string | null;
  hidden: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  fileDeleted: boolean;
};

export type ImportWorkerControlState = {
  workerName: string;
  control: {
    globalPaused?: boolean;
    batchPaused?: boolean;
    workerPaused?: boolean;
  };
};

export type ImportAnafProgress = {
  state: string;
  totalCuis: number;
  processedCuis: number;
  totalBatches: number;
  processedBatches: number;
  failedBatches: number;
  heartbeatAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  throughput: number | null;
};

export type ImportPromotionMetrics = {
  scopeTotal: number;
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  running: number;
  paused: number;
  silverContactsInitial: number;
  silverContactsPromotedDuringSession: number;
  silverContactsCurrent: number;
  externalDelta: number;
};

export type ImportRuntimeTopology = {
  batchId: string;
  batchStatus: string;
  legacyTelemetry?: boolean;
  session?: {
    id: string;
    kind: string;
    status: string;
    label: string | null;
    startedAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
    pausedAt: string | null;
    lastHeartbeatAt: string | null;
    updatedAt: string | null;
  } | null;
  control?: {
    global: ImportGlobalControlState;
    batch: ImportBatchControlState;
  };
  anafProgress?: ImportAnafProgress | null;
  promotionMetrics?: ImportPromotionMetrics | null;
  workers: ImportRuntimeWorker[];
  totals: {
    logsLoaded: number;
    workersDefined: number;
    liveWaiting: number;
    liveActive: number;
    liveDelayed: number;
    liveFailed: number;
    observedJobs: number;
  };
};

export async function fetchImportRuntimeTopology(
  id: string,
  params: {
    session?: string;
    worker?: string;
    state?: string;
    search?: string;
    limit?: number;
  } = {},
) {
  const query = new URLSearchParams();
  appendParams(query, params);
  return api.get<ApiObjectResponse<ImportRuntimeTopology>>(
    `/api/v1/imports/${id}/runtime-topology?${query}`,
  );
}

export async function fetchImportControl() {
  return api.get<ApiObjectResponse<ImportGlobalControlState>>("/api/v1/imports/control");
}

export async function pauseImportsGlobal() {
  return api.post<ApiObjectResponse<ImportGlobalControlState>>("/api/v1/imports/control/pause");
}

export async function resumeImportsGlobal(mode?: "resume" | "recover") {
  return api.post<ApiObjectResponse<Record<string, unknown>>>("/api/v1/imports/control/resume", {
    ...(mode ? { mode } : {}),
  });
}

export async function pauseImportBatch(id: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/imports/${id}/pause`);
}

export async function resumeImportBatch(id: string, mode?: "resume" | "recover") {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/imports/${id}/resume`, {
    ...(mode ? { mode } : {}),
  });
}

export async function resumeImportBatchScoped(
  id: string,
  params: {
    mode?: "resume" | "recover";
    sessionId?: string;
    allSessions?: boolean;
  } = {},
) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/imports/${id}/resume`,
    params,
  );
}

export async function pauseImportWorker(id: string, workerName: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/imports/${id}/workers/${encodeURIComponent(workerName)}/pause`,
  );
}

export async function resumeImportWorker(
  id: string,
  workerName: string,
  mode?: "resume" | "recover",
) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/imports/${id}/workers/${encodeURIComponent(workerName)}/resume`,
    {
      ...(mode ? { mode } : {}),
    },
  );
}

export async function resumeImportWorkerScoped(
  id: string,
  workerName: string,
  params: {
    mode?: "resume" | "recover";
    sessionId?: string;
    allSessions?: boolean;
  } = {},
) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/imports/${id}/workers/${encodeURIComponent(workerName)}/resume`,
    params,
  );
}

export async function deleteImportBatch(id: string) {
  return api.delete<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/imports/${id}`);
}

export async function resumePromoteJob(id: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/imports/${id}/resume-promote`,
  );
}

export async function anafEnrichImport(id: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/imports/${id}/anaf-enrich`);
}

export async function fetchBronzeContacts(params: BronzeContactsParams = {}) {
  const query = new URLSearchParams();
  appendParams(query, {
    limit: params.limit ?? 25,
    offset: params.offset ?? 0,
    status: params.status,
    sourceType: params.sourceType,
    search: params.search,
    batchId: params.batchId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });
  return api.get<ApiListResponse<Record<string, unknown>>>(`/api/v1/bronze/contacts?${query}`);
}

export async function fetchBronzeContactById(id: string) {
  return api.get<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/bronze/contacts/${id}`);
}

export async function reprocessBronzeContact(id: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/bronze/contacts/${id}/reprocess`,
  );
}

export async function fetchSilverCompanies(params: SilverCompaniesParams = {}) {
  const query = new URLSearchParams();
  appendParams(query, {
    limit: params.limit ?? 25,
    offset: params.offset ?? 0,
    search: params.search,
    enrichmentStatus: params.enrichmentStatus,
    promotionStatus: params.promotionStatus,
    statusFirma: params.statusFirma,
    judet: params.judet,
    minQuality: params.minQuality,
    maxQuality: params.maxQuality,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });
  return api.get<ApiListResponse<Record<string, unknown>>>(`/api/v1/silver/companies?${query}`);
}

export async function fetchSilverCompanyById(id: string) {
  return api.get<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/silver/companies/${id}`);
}

export async function triggerSilverEnrich(id: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/silver/companies/${id}/enrich`,
    {
      force: true,
    },
  );
}

export async function triggerSilverPromote(id: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/silver/companies/${id}/promote`,
    {
      force: true,
    },
  );
}

export async function fetchGoldCompanies(params: GoldCompaniesParams = {}) {
  const query = new URLSearchParams();
  appendParams(query, {
    search: params.search,
    currentState: params.currentState,
    judetCod: params.judetCod,
    assignedTo: params.assignedTo,
    unassigned: params.unassigned,
    doNotContact: params.doNotContact,
    notInOutreach: params.notInOutreach,
    minLeadScore: params.minLeadScore,
    maxLeadScore: params.maxLeadScore,
    isAgricultural: params.isAgricultural,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    limit: params.limit ?? 25,
    offset: params.offset ?? 0,
  });
  return api.get<ApiListResponse<Record<string, unknown>>>(`/api/v1/gold/companies?${query}`);
}

export async function fetchGoldCompanyById(id: string) {
  return api.get<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/gold/companies/${id}`);
}

export async function patchGoldCompany(
  id: string,
  payload: {
    currentState?:
      | "COLD"
      | "CONTACTED_WA"
      | "CONTACTED_EMAIL"
      | "CONTACTED_PHONE"
      | "WARM_REPLY"
      | "ENGAGED"
      | "NEGOTIATION"
      | "PROPOSAL"
      | "CLOSING"
      | "CONVERTED"
      | "CHURNED"
      | "DEAD"
      | "DO_NOT_CONTACT";
    doNotContact?: boolean;
  },
) {
  return api.patch<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/gold/companies/${id}`,
    payload,
  );
}

export async function transitionGoldCompany(
  id: string,
  payload: {
    toState:
      | "COLD"
      | "CONTACTED_WA"
      | "CONTACTED_EMAIL"
      | "CONTACTED_PHONE"
      | "WARM_REPLY"
      | "ENGAGED"
      | "NEGOTIATION"
      | "PROPOSAL"
      | "CLOSING"
      | "CONVERTED"
      | "ONBOARDING"
      | "NURTURING_ACTIVE"
      | "AT_RISK"
      | "LOYAL_ADVOCATE"
      | "CHURNED"
      | "DEAD"
      | "DO_NOT_CONTACT";
  },
) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/gold/companies/${id}/transition`,
    payload,
  );
}

export async function fetchSilverEnrichmentLog(entityId?: string, limit = 50, offset = 0) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (entityId) params.set("entityId", entityId);
  return api.get<ApiListResponse<Record<string, unknown>>>(
    `/api/v1/silver/enrichment-log?${params}`,
  );
}

export async function fetchGoldCompanyJourney(id: string, limit = 50, offset = 0) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return api.get<ApiListResponse<Record<string, unknown>>>(
    `/api/v1/gold/companies/${id}/journey?${params}`,
  );
}

export type DailyStatsParams = {
  days?: number;
  pipelineStage?: string;
  limit?: number;
  offset?: number;
};

export async function fetchDashboardDailyStats(params: DailyStatsParams = {}) {
  const query = new URLSearchParams();
  appendParams(query, {
    days: params.days ?? 30,
    pipelineStage: params.pipelineStage,
    limit: params.limit,
    offset: params.offset,
  });
  return api.get<ApiListResponse<DailyStatRow>>(`/api/v1/dashboard/daily-stats?${query}`);
}

export type ApprovalTask = {
  id: string;
  tenantId: string;
  type: string;
  approvalType:
    | "dedup_review"
    | "identity_conflict"
    | "quality_review"
    | "ai_structuring_review"
    | "ai_merge_review"
    | "low_confidence_review"
    | "data_anomaly"
    | "manual_verification"
    | "error_review";
  status: "pending" | "assigned" | "approved" | "rejected" | "escalated" | "expired" | "cancelled";
  urgency: "low" | "medium" | "high" | "critical";
  priorityLevel: "critical" | "high" | "normal" | "low";
  pipelineStage: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string | null;
  aiConfidence: number | null;
  aiRecommendation: string | null;
  aiReasoning: string | null;
  requestedBy: string;
  assignedTo: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decision: string | null;
  decisionReason: string | null;
  dueAt: string | null;
  escalationLevel: number;
  expiresAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export async function fetchApprovals(params: ApprovalListParams = {}) {
  const query = new URLSearchParams();
  appendParams(query, {
    statuses: params.statuses,
    assignedTo: params.assignedTo,
    unassigned: params.unassigned,
    approvalType: params.approvalType,
    priority: params.priority,
    pipelineStage: params.pipelineStage,
    overdue: params.overdue,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    limit: params.limit ?? 25,
  });
  return api.get<ApiObjectResponse<ApprovalTask[]>>(`/api/v1/enrichment/approvals?${query}`);
}

export async function fetchApprovalById(id: string) {
  return api.get<
    ApiObjectResponse<Record<string, unknown>> & {
      entityData?: Record<string, unknown> | null;
    }
  >(`/api/v1/enrichment/approvals/${id}`);
}

export async function fetchApprovalStats() {
  return api.get<ApiObjectResponse<Record<string, unknown>>>("/api/v1/enrichment/approvals/stats");
}

export async function decideApproval(
  id: string,
  decision: "approve" | "reject" | "merge" | "skip",
) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/enrichment/approvals/${id}/decide`,
    {
      decision,
    },
  );
}

export async function assignApproval(id: string, userId: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/enrichment/approvals/${id}/assign`,
    {
      userId,
    },
  );
}

export async function escalateApproval(id: string, reason: string, escalateTo?: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/enrichment/approvals/${id}/escalate`,
    {
      reason,
      ...(escalateTo ? { escalateTo } : {}),
    },
  );
}

export async function fetchQueueStatuses() {
  return api.get<ApiListResponse<Record<string, unknown>>>("/api/v1/enrichment/queues");
}

export async function fetchQueueStatusByName(name: string) {
  return api.get<ApiObjectResponse<Record<string, unknown>>>(`/api/v1/enrichment/queues/${name}`);
}

export async function pauseQueue(name: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/enrichment/queues/${name}/pause`,
  );
}

export async function resumeQueue(name: string) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/enrichment/queues/${name}/resume`,
  );
}

export type DedupCandidatesParams = {
  status?: "pending" | "rejected" | "expired" | "auto_merged" | "hitl_pending" | "merged";
  limit?: number;
  offset?: number;
};

export async function fetchDedupCandidates(params: DedupCandidatesParams = {}) {
  const query = new URLSearchParams();
  appendParams(query, {
    limit: params.limit ?? 25,
    offset: params.offset ?? 0,
    status: params.status,
  });
  return api.get<ApiListResponse<Record<string, unknown>>>(
    `/api/v1/silver/dedup-candidates?${query}`,
  );
}

export async function decideDedupPair(
  id: string,
  decision: "merge" | "reject" | "skip",
  masterCompanyId?: string,
) {
  return api.post<ApiObjectResponse<Record<string, unknown>>>(
    `/api/v1/silver/dedup-candidates/${id}/decide`,
    {
      decision,
      masterCompanyId,
    },
  );
}

// ── Job Logs ────────────────────────────────────────────────────────────────

export type JobLogLevel = "info" | "warn" | "error" | "step";

export type JobLog = {
  id: string;
  tenantId: string;
  batchId: string | null;
  sessionId: string | null;
  bronzeContactId: string | null;
  workerName: string;
  jobId: string | null;
  runtimeJobKey: string | null;
  parentRuntimeJobKey: string | null;
  step: string;
  level: JobLogLevel;
  message: string;
  details: Record<string, unknown> | null;
  durationMs: number | null;
  createdAt: string;
};

export type JobLogsParams = {
  level?: JobLogLevel;
  worker?: string;
  jobId?: string;
  bronzeContactId?: string;
  sessionId?: string;
  includeLegacy?: boolean;
  tail?: boolean;
  limit?: number;
  offset?: number;
};

export async function fetchImportJobLogs(batchId: string, params: JobLogsParams = {}) {
  const query = new URLSearchParams();
  appendParams(query, {
    level: params.level,
    worker: params.worker,
    jobId: params.jobId,
    bronzeContactId: params.bronzeContactId,
    sessionId: params.sessionId,
    includeLegacy: params.includeLegacy,
    tail: params.tail,
    limit: params.limit ?? 200,
    offset: params.offset ?? 0,
  });
  return api.get<ApiListResponse<JobLog>>(`/api/v1/imports/${batchId}/job-logs?${query}`);
}

export type QuarantinedImportRow = {
  id: string;
  batchId: string;
  sessionId: string | null;
  runtimeJobKey: string | null;
  sourceType: string;
  sourceIdentifier: string;
  sheetName: string | null;
  worksheetRow: number | null;
  globalRow: number | null;
  fieldName: string | null;
  reasonCode: string;
  rowPayloadEscaped: Record<string, unknown>;
  sanitizedPayload: Record<string, unknown> | null;
  violations: Array<Record<string, unknown>>;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export async function fetchImportQuarantine(
  batchId: string,
  params: {
    sessionId?: string;
    reasonCode?: string;
    sheet?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const query = new URLSearchParams();
  appendParams(query, {
    sessionId: params.sessionId,
    reasonCode: params.reasonCode,
    sheet: params.sheet,
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
  });
  return api.get<ApiListResponse<QuarantinedImportRow>>(
    `/api/v1/imports/${batchId}/quarantine?${query}`,
  );
}
