/**
 * Contracte comune pentru răspunsuri API Cerniq (Fastify + envelope `{ success, data, meta? }`).
 * Nu înlocuiește schemele Zod din backend — folosiți aceste tipuri ca ghid pentru `api.get`/`api.post` în SPA.
 */

/** Răspuns listă paginată tipic /api/v1/* */
export type ApiListMeta = {
  total?: number;
  page?: number;
  limit?: number;
};

export type ApiListEnvelope<T> = {
  success?: boolean;
  data?: T[];
  meta?: ApiListMeta;
};

export type ApiDataEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

/** GET /api/v1/dashboard/stats — aliniat la `dashboardRoutes` în apps/api */
export type DashboardStatsPayload = {
  bronze: { total: number; pending: number; processing: number; promoted: number };
  silver: {
    total: number;
    pending: number;
    inProgress: number;
    complete: number;
    eligible: number;
  };
  gold: { total: number; cold: number; engaged: number; converted: number };
  approvals: { pending: number; overdue: number };
  errors: { last24h: number; critical: number };
  pipeline: { queueDepth: number; failingQueues: number };
  hitl: { pending: number; resolvedToday: number; overdue: number };
  quality: { avgScore: number; eligible: number; blocked: number };
};

/** Mapare resurse Refine → path HTTP (vezi `resourceToApiPath` în lib/api-path.ts). */
export const REFINE_RESOURCE_EXAMPLES = [
  "products → GET /api/v1/products?page=&limit=",
  "v1/negotiation → prefix deja compatibil cu /api/v1/negotiation",
] as const;
