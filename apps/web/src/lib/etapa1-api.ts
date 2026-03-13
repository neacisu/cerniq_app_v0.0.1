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
  currentState?: string[];
  judetCod?: string;
  assignedTo?: string;
  unassigned?: boolean;
  doNotContact?: boolean;
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

function appendParams(params: URLSearchParams, values: Record<string, unknown>) {
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

export async function fetchDashboardActivity(limit = 20) {
  return api.get<ApiObjectResponse<Array<Record<string, unknown>>>>(
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
    currentState: params.currentState,
    judetCod: params.judetCod,
    assignedTo: params.assignedTo,
    unassigned: params.unassigned,
    doNotContact: params.doNotContact,
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
  return api.get<ApiListResponse<Record<string, unknown>>>(
    `/api/v1/dashboard/daily-stats?${query}`,
  );
}

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
  return api.get<ApiObjectResponse<Array<Record<string, unknown>>>>(
    `/api/v1/enrichment/approvals?${query}`,
  );
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
