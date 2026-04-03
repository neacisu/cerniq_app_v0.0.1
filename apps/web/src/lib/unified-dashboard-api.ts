/**
 * Agregare GET-uri existente pentru panoul principal /dashboard.
 * Fără date inventate: fiecare fetch mapează 1:1 pe rute Fastify înregistrate.
 */
import { api } from "./api.js";

type ApiObject<T> = { success?: boolean; data?: T };

export type NegotiationStatsData = {
  byState: { state: string; count: number; totalValue: string }[];
  avgAiConfidence: string;
  avgCloseProbability: string;
};

export type ProductStatsData = {
  products: { total: number; active: number; withEmbeddings: number };
  inventory: { totalSkus: number; totalStock: number; reserved: number };
};

export type OrderStatsData = {
  byStatus: { status: string; count: number; totalAmount: string }[];
  overdue: { count: number; totalDue: string };
};

export type CreditStatsData = {
  byRisk: { riskTier: string; count: number; totalLimit: string; totalUsed: string }[];
  scoreStats: { avg: string; min: number; max: number };
};

export type ContractStatsData = {
  byStatus: { status: string; count: number }[];
  expiringIn7Days: number;
};

export type ShipmentStatsData = {
  byStatus: { status: string; count: number }[];
  cod: { total: number; collected: number; codAmount: string };
};

export type NurturingStatsData = {
  byState: { currentState: string; count: number; avgChurnScore: string; avgRevenue: string }[];
  nps: { totalSent: number; responded: number; avgScore: string };
};

export type ChurnStatsData = {
  byRisk: { riskLevel: string | null; count: number; avgScore: string }[];
  bySignalType: { signalType: string; count: number; avgStrength: string }[];
  sentiment: { positive: number; neutral: number; negative: number };
};

export type ReferralStatsData = {
  byStatus: { status: string; count: number }[];
  byType: { referralType: string; count: number; converted: number }[];
  consent: { total: number; withConsent: number };
};

export type GraphStatsData = {
  clusters: {
    totalClusters: number;
    avgMemberCount: string;
    avgModularity: string;
    kolCount: number;
  };
  relationships: { totalRelationships: number };
};

export type BrainCatalogPayload = {
  nodes: unknown[];
  stats: {
    total: number;
    skippedTotal: number;
    skippedQueues: number;
    byEtapa: Record<string, number>;
    bySwimlane: Record<string, number>;
    byNeuronType: Record<string, number>;
  };
};

export type BrainTopologyPayload = {
  nodes: {
    nodeKey: string;
    status: string;
    metrics: { processed: number; failed: number; avgLatency: number };
  }[];
  edges: unknown[];
  metadata: { totalNeurons: number; activeNeurons: number; lastUpdated: string };
};

export type FiscalOblioStatsData = {
  oblioByType: { documentType: string; count: number; total: string }[];
  einvoice: {
    total: number;
    validated: number;
    pending: number;
    rejected: number;
  };
};

export type E5ComplianceAlertStatsData = {
  byRiskLevel: { riskLevel: string | null; count: number }[];
  summary: {
    atRiskCount: number;
    churnedCount: number;
    criticalCount: number;
  };
};

export async function fetchNegotiationStats() {
  return api.get<ApiObject<NegotiationStatsData>>("/api/v1/negotiation/stats");
}

export async function fetchProductStats() {
  return api.get<ApiObject<ProductStatsData>>("/api/v1/products/stats");
}

export async function fetchOrderStats() {
  return api.get<ApiObject<OrderStatsData>>("/api/v1/orders/stats");
}

export async function fetchCreditStats() {
  return api.get<ApiObject<CreditStatsData>>("/api/v1/credit/stats");
}

export async function fetchContractStats() {
  return api.get<ApiObject<ContractStatsData>>("/api/v1/contracts/stats");
}

export async function fetchShipmentStats() {
  return api.get<ApiObject<ShipmentStatsData>>("/api/v1/shipments/stats");
}

export async function fetchNurturingStats() {
  return api.get<ApiObject<NurturingStatsData>>("/api/v1/nurturing/stats");
}

export async function fetchChurnStats() {
  return api.get<ApiObject<ChurnStatsData>>("/api/v1/churn/stats");
}

export async function fetchReferralStats() {
  return api.get<ApiObject<ReferralStatsData>>("/api/v1/referrals/stats");
}

export async function fetchGraphStats() {
  return api.get<ApiObject<GraphStatsData>>("/api/v1/graph/stats");
}

export async function fetchBrainCatalog() {
  return api.get<ApiObject<BrainCatalogPayload>>("/api/v1/brain/catalog");
}

export async function fetchBrainTopologyGlobal() {
  return api.get<ApiObject<BrainTopologyPayload>>("/api/v1/brain/topology");
}

export async function fetchFiscalOblioStats() {
  return api.get<ApiObject<FiscalOblioStatsData>>("/api/v1/fiscal/oblio/stats");
}

export async function fetchE5ComplianceAlertStats() {
  return api.get<ApiObject<E5ComplianceAlertStatsData>>("/api/v1/e5/alerts/compliance/stats");
}
