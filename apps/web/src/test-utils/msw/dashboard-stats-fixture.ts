/**
 * Fixture MSW aliniată la `DashboardStatsPayload` (aceeași formă ca `loadDashboardStatsPayload` / `apps/web/src/types/api.ts`).
 * Evită numere mari fictive care induceau în eroare în teste RTL.
 */
import type { DashboardStatsPayload } from "@/types/api.js";

export const MSW_DASHBOARD_STATS_FIXTURE: DashboardStatsPayload = {
  bronze: { total: 12, pending: 2, processing: 1, promoted: 3 },
  silver: { total: 8, pending: 1, inProgress: 0, complete: 5, eligible: 2 },
  gold: { total: 4, cold: 1, engaged: 2, converted: 1 },
  approvals: { pending: 1, overdue: 0 },
  errors: { last24h: 0, critical: 0 },
  pipeline: { queueDepth: 14, failingQueues: 0 },
  hitl: { pending: 0, resolvedToday: 0, overdue: 0 },
  quality: { avgScore: 0.92, eligible: 10, blocked: 0 },
};
