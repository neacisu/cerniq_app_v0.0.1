/**
 * Client tipat pentru rutele E5 (nurturing, churn, graph, referrals, geo).
 * Path-urile reflectă înregistrarea din API: `/api/v1/nurturing`, `/churn`, `/graph`, `/referrals`.
 */
import { api } from "./api.js";

export type ApiListMeta = {
  page: number;
  limit: number;
  total: number;
  pages?: number;
};

export type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  meta?: ApiListMeta;
};

function withQuery(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `${path}?${q}` : path;
}

const REFERRALS = "/api/v1/referrals";
const GRAPH = "/api/v1/graph";
const NURTURING = "/api/v1/nurturing";
const CHURN = "/api/v1/churn";

/** Ordinea stabilă pentru pie + totaluri (aliniază la enum DB / `nurturingRoutes`). */
export const NURTURING_STATE_ORDER = [
  "ONBOARDING",
  "NURTURING_ACTIVE",
  "AT_RISK",
  "CHURNED",
  "REACTIVATED",
  "LOYAL_CLIENT",
  "ADVOCATE",
] as const;

export type NurturingStateKey = (typeof NURTURING_STATE_ORDER)[number];

export type NurturingStateListRow = {
  id: string;
  leadId: string;
  tenantId: string;
  currentState: string;
  churnRiskScore: number;
  churnRiskLevel: string;
  totalOrders: number;
  totalRevenue: string;
  daysSinceLastOrder: number | null;
  npsScore: number | null;
  satisfactionTrend: string | null;
  successfulReferrals: number;
  neighborCount: number;
  isAdvocate: boolean;
  isKol: boolean;
  lastInteractionAt: string;
  companyName: string | null;
  cui: string | null;
  judet: string | null;
};

export function fetchNurturingStates(params?: {
  currentState?: string;
  churnRiskLevel?: string;
  isAdvocate?: boolean;
  isKol?: boolean;
  page?: number;
  limit?: number;
}): Promise<ApiListResponse<NurturingStateListRow>> {
  return api.get(
    withQuery(`${NURTURING}/states`, {
      currentState: params?.currentState,
      churnRiskLevel: params?.churnRiskLevel,
      isAdvocate: params?.isAdvocate,
      isKol: params?.isKol,
      page: params?.page,
      limit: params?.limit,
    }),
  );
}

export function postNurturingEvaluate(leadId: string): Promise<{
  success: boolean;
  data: { jobId: string };
}> {
  return api.post(`${NURTURING}/states/${leadId}/evaluate`, {});
}

export type ChurnFactorRow = {
  id: string;
  leadId: string;
  tenantId: string;
  overallChurnScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factorBreakdown: unknown;
  activeSignalCount: number;
  lastCalculatedAt: string;
  companyName: string | null;
  cui: string | null;
  judet: string | null;
};

export function fetchChurnFactors(params?: {
  riskLevel?: string;
  minScore?: number;
  page?: number;
  limit?: number;
}): Promise<ApiListResponse<ChurnFactorRow>> {
  return api.get(
    withQuery(`${CHURN}/factors`, {
      riskLevel: params?.riskLevel,
      minScore: params?.minScore,
      page: params?.page ?? 1,
      limit: params?.limit ?? 100,
    }),
  );
}

/** Agregă pagini până la `maxRows` sau până la epuizarea totalului din meta. */
export async function fetchChurnFactorsBatched(maxRows = 500): Promise<ChurnFactorRow[]> {
  const out: ChurnFactorRow[] = [];
  let page = 1;
  const limit = 100;
  for (;;) {
    const r = await fetchChurnFactors({ page, limit });
    out.push(...r.data);
    const total = r.meta?.total ?? 0;
    if (out.length >= total || r.data.length < limit || out.length >= maxRows) break;
    page += 1;
    if (page > 20) break;
  }
  return out.slice(0, maxRows);
}

export type ChurnStatsResponse = {
  success: boolean;
  data: {
    byRisk: { riskLevel: string; count: number; avgScore: string }[];
    bySignalType: { signalType: string; count: number; avgStrength: string }[];
    sentiment: { positive: number; neutral: number; negative: number };
  };
};

export function fetchChurnStats(): Promise<ChurnStatsResponse> {
  return api.get(`${CHURN}/stats`);
}

export function postChurnEvaluate(
  leadId: string,
  body?: { force?: boolean },
): Promise<{ success: boolean; data: { jobId: string } }> {
  return api.post(`${CHURN}/${leadId}/evaluate`, body ?? {});
}

export type GraphKolProfileRow = {
  clusterId: string;
  clusterName: string | null;
  modularityScore: string;
  memberCount: number;
  detectionMethod: string;
  kolClientId: string;
  companyName: string | null;
  cui: string | null;
  judet: string | null;
  updatedAt: string;
};

export function fetchGraphKolProfiles(params?: {
  page?: number;
  limit?: number;
}): Promise<ApiListResponse<GraphKolProfileRow>> {
  return api.get(
    withQuery(`${GRAPH}/kol-profiles`, { page: params?.page ?? 1, limit: params?.limit ?? 100 }),
  );
}

export type GraphRelationshipRow = {
  id: string;
  tenantId: string;
  entityAId: string;
  entityBId: string;
  relationType: string;
  confidence: string | null;
};

export function fetchGraphRelationships(params?: {
  page?: number;
  limit?: number;
}): Promise<ApiListResponse<GraphRelationshipRow>> {
  return api.get(
    withQuery(`${GRAPH}/relationships`, {
      page: params?.page ?? 1,
      limit: params?.limit ?? 200,
    }),
  );
}

export type ReferralListRow = {
  id: string;
  tenantId: string;
  referrerId: string;
  referredId: string | null;
  referralType: string;
  status: string;
  consentGiven: boolean;
  consentGivenAt: string | null;
  rewardType: string | null;
  rewardValue: string | null;
  rewardIssuedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  referrerName: string | null;
  referrerCui: string | null;
  referredName: string | null;
  referredCui: string | null;
};

export function fetchReferralsList(params?: {
  page?: number;
  limit?: number;
  status?: string;
  consentGiven?: boolean;
}): Promise<ApiListResponse<ReferralListRow>> {
  return api.get(
    withQuery(REFERRALS, {
      page: params?.page,
      limit: params?.limit,
      status: params?.status,
      consentGiven: params?.consentGiven,
    }),
  );
}

export type GeoSummaryRow = {
  regionLabel: string;
  companyCount: number;
  revenueSum: string;
  avgLatitude: string | null;
  avgLongitude: string | null;
};

export type GeoSummaryResponse = {
  success: boolean;
  data: GeoSummaryRow[];
};

export function fetchGraphGeoSummary(): Promise<GeoSummaryResponse> {
  return api.get(`${GRAPH}/geo-summary`);
}
