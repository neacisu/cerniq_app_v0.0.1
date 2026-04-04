/**
 * Client tipat pentru rutele E4: orders, credit, contracts, shipments.
 * Formele reflectă răspunsurile din apps/api (order.ts, credit.ts, contract.ts, shipment.ts).
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

export type ApiDataResponse<T> = { success: boolean; data: T };

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `${path}?${q}` : path;
}

const ORDERS = "/api/v1/orders";
const CREDIT = "/api/v1/credit";
const CONTRACTS = "/api/v1/contracts";
const SHIPMENTS = "/api/v1/shipments";

// ─── Orders ───────────────────────────────────────────────────────────────────

export type GoldOrderListRow = {
  id: string;
  tenantId: string;
  leadId: string;
  orderNumber: string;
  status: string;
  paymentMethod: string | null;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  currency: string;
  paymentDueAt: string | null;
  companyName: string | null;
  cui: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderStatsPayload = {
  byStatus: Array<{ status: string; count: number; totalAmount: string }>;
  overdue: { count: number; totalDue: string };
};

export function fetchOrdersList(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<ApiListResponse<GoldOrderListRow>> {
  return api.get(
    withQuery(ORDERS, { page: params?.page, limit: params?.limit, status: params?.status }),
  );
}

export function fetchOrderStats(): Promise<ApiDataResponse<OrderStatsPayload>> {
  return api.get(`${ORDERS}/stats`);
}

export type TenantPaymentRow = {
  id: string;
  tenantId: string;
  orderId: string | null;
  externalSource: string;
  amount: string;
  currency: string;
  reconciliationStatus: string;
  counterpartyName: string | null;
  counterpartyIban: string | null;
  reference: string | null;
  receivedAt: string | null;
  createdAt: string;
  orderNumber: string | null;
  companyName: string | null;
  cui: string | null;
};

export function fetchTenantPayments(params?: {
  page?: number;
  limit?: number;
  reconciliationStatus?: string;
}): Promise<ApiListResponse<TenantPaymentRow>> {
  return api.get(
    withQuery(`${ORDERS}/payments`, {
      page: params?.page,
      limit: params?.limit,
      reconciliationStatus: params?.reconciliationStatus,
    }),
  );
}

export type ShipmentListRow = {
  id: string;
  orderId: string;
  awbNumber: string | null;
  carrier: string;
  status: string;
  codType: string;
  codAmount: string;
  /** Monedă comandă (join gold_orders), pentru afișare COD */
  currency: string;
  labelPdfUrl: string | null;
  estimatedDelivery: string | null;
  orderNumber: string | null;
  companyName: string | null;
  createdAt: string;
};

export function fetchShipmentsList(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<ApiListResponse<ShipmentListRow>> {
  return api.get(
    withQuery(SHIPMENTS, { page: params?.page, limit: params?.limit, status: params?.status }),
  );
}

export type ShipmentDetail = ShipmentListRow & {
  trackingUrl: string | null;
  weight: string | null;
  deliveryAddress: Record<string, unknown> | null;
  trackingEvents: Array<{
    id: string;
    statusCode: string | null;
    statusText: string | null;
    locationCity: string | null;
    locationCounty: string | null;
    eventTimestamp: string;
  }>;
  codCollections: unknown[];
};

export function fetchShipmentDetail(id: string): Promise<ApiDataResponse<ShipmentDetail>> {
  return api.get(`${SHIPMENTS}/${id}`);
}

// ─── Credit ───────────────────────────────────────────────────────────────────

export type CreditProfileListRow = {
  id: string;
  tenantId: string;
  clientId: string;
  creditScore: number;
  riskTier: string;
  creditLimit: string;
  creditUsed: string;
  scoreComponents: unknown;
  bpiStatus: string | null;
  autoRefreshEnabled: boolean;
  nextReviewAt: string | null;
  companyName: string | null;
  cui: string | null;
  createdAt: string;
  updatedAt: string;
};

export function fetchCreditProfiles(params?: {
  page?: number;
  limit?: number;
  riskTier?: string;
}): Promise<ApiListResponse<CreditProfileListRow>> {
  return api.get(
    withQuery(`${CREDIT}/profiles`, {
      page: params?.page,
      limit: params?.limit,
      riskTier: params?.riskTier,
    }),
  );
}

export type CreditStatsPayload = {
  byRisk: Array<{ riskTier: string; count: number; totalLimit: string; totalUsed: string }>;
  scoreStats: { avg: string; min: number; max: number };
};

export function fetchCreditStats(): Promise<ApiDataResponse<CreditStatsPayload>> {
  return api.get(`${CREDIT}/stats`);
}

export type CreditScoreHistoryRow = {
  id: string;
  profileId: string;
  score: number;
  riskTier: string;
  scoreComponents: unknown;
  calculatedAt: string;
  source: string | null;
};

export function fetchCreditHistory(
  clientId: string,
  limit = 20,
): Promise<ApiDataResponse<CreditScoreHistoryRow[]>> {
  return api.get(withQuery(`${CREDIT}/profiles/${clientId}/history`, { limit }));
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export type ContractListRow = {
  id: string;
  tenantId: string;
  clientId: string;
  orderId: string | null;
  riskTier: string;
  status: string;
  docusignEnvelopeId: string | null;
  docusignStatus: string | null;
  pdfUrl: string | null;
  signedPdfUrl: string | null;
  clausesUsed: unknown;
  validForDays: number;
  expiresAt: string | null;
  signedAt: string | null;
  companyName: string | null;
  cui: string | null;
  orderNumber: string | null;
  createdAt: string;
  updatedAt: string;
};

export function fetchContractsList(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<ApiListResponse<ContractListRow>> {
  return api.get(
    withQuery(CONTRACTS, { page: params?.page, limit: params?.limit, status: params?.status }),
  );
}

export function postContractSendDocusign(
  contractId: string,
): Promise<ApiDataResponse<{ jobId: string }>> {
  return api.post(`${CONTRACTS}/${contractId}/send-docusign`);
}
