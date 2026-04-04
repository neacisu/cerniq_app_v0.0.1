/**
 * Client tipat pentru rutele E5 folosite de geo-map și referral manager.
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
}): Promise<ApiListResponse<ReferralListRow>> {
  return api.get(
    withQuery(REFERRALS, { page: params?.page, limit: params?.limit, status: params?.status }),
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
