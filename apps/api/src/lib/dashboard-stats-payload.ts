/**
 * Calcul unic pentru payload-ul `GET /api/v1/dashboard/stats` și fluxul SSE `/kpi-stream`.
 */
import type { FastifyBaseLogger } from "fastify";
import {
  approvalTasks,
  bronzeContacts,
  db,
  goldCompanies,
  pipelineErrors,
  silverCompanies,
  sql,
} from "@cerniq/db";
import { queueRegistry } from "@cerniq/worker-shared";
import { createQueue } from "./queue-factory.js";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function isSchemaPermissionError(err: unknown): boolean {
  const obj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
  const cause =
    obj.cause && typeof obj.cause === "object" ? (obj.cause as Record<string, unknown>) : {};
  const values = [
    getErrorMessage(err),
    typeof obj.code === "string" ? obj.code : "",
    typeof cause.code === "string" ? cause.code : "",
    typeof cause.message === "string" ? cause.message : "",
  ]
    .filter(Boolean)
    .join(" ");
  return /permission denied for schema/i.test(values) || /\b42501\b/.test(values);
}

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

const ZERO_PAYLOAD: DashboardStatsPayload = {
  bronze: { total: 0, pending: 0, processing: 0, promoted: 0 },
  silver: { total: 0, pending: 0, inProgress: 0, complete: 0, eligible: 0 },
  gold: { total: 0, cold: 0, engaged: 0, converted: 0 },
  approvals: { pending: 0, overdue: 0 },
  errors: { last24h: 0, critical: 0 },
  pipeline: { queueDepth: 0, failingQueues: 0 },
  hitl: { pending: 0, resolvedToday: 0, overdue: 0 },
  quality: { avgScore: 0, eligible: 0, blocked: 0 },
};

export async function loadDashboardStatsPayload(
  tenantId: string,
  log: FastifyBaseLogger,
): Promise<DashboardStatsPayload> {
  try {
    const queueDepthsSettled = await Promise.allSettled(
      queueRegistry.map(async (q) => {
        const queue = createQueue(q.name);
        try {
          const counts = await queue.getJobCounts(
            "waiting",
            "active",
            "completed",
            "failed",
            "delayed",
            "paused",
          );
          return {
            name: q.name,
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            delayed: counts.delayed ?? 0,
            failed: counts.failed ?? 0,
          };
        } finally {
          await queue.close().catch(() => undefined);
        }
      }),
    );

    const queueDepths = queueDepthsSettled.flatMap((result) => {
      if (result.status === "fulfilled") return [result.value];
      throw result.reason;
    });

    const [
      bronzeStats,
      silverStats,
      goldStats,
      approvalStats,
      errorStats,
      hitlResolvedToday,
      qualityStats,
    ] = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);

      return Promise.all([
        tx
          .select({
            total: sql<number>`COUNT(*)`,
            pending: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.processingStatus} = 'pending')`,
            processing: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.processingStatus} = 'processing')`,
            promoted: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.processingStatus} = 'promoted')`,
          })
          .from(bronzeContacts)
          .where(sql`${bronzeContacts.tenantId} = ${tenantId}`),
        tx
          .select({
            total: sql<number>`COUNT(*)`,
            pending: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.enrichmentStatus} = 'pending')`,
            inProgress: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.enrichmentStatus} = 'in_progress')`,
            complete: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.enrichmentStatus} = 'complete')`,
            eligible: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.promotionStatus} = 'eligible')`,
          })
          .from(silverCompanies)
          .where(sql`${silverCompanies.tenantId} = ${tenantId}`),
        tx
          .select({
            total: sql<number>`COUNT(*)`,
            cold: sql<number>`COUNT(*) FILTER (WHERE ${goldCompanies.currentState} = 'COLD')`,
            engaged: sql<number>`COUNT(*) FILTER (WHERE ${goldCompanies.currentState} IN ('WARM_REPLY','ENGAGED','NEGOTIATION','PROPOSAL','CLOSING'))`,
            converted: sql<number>`COUNT(*) FILTER (WHERE ${goldCompanies.currentState} = 'CONVERTED')`,
          })
          .from(goldCompanies)
          .where(sql`${goldCompanies.tenantId} = ${tenantId}`),
        tx
          .select({
            pending: sql<number>`COUNT(*) FILTER (WHERE ${approvalTasks.status} IN ('pending','assigned','escalated'))`,
            overdue: sql<number>`COUNT(*) FILTER (WHERE ${approvalTasks.status} IN ('pending','assigned','escalated') AND COALESCE(${approvalTasks.dueAt}, ${approvalTasks.expiresAt}) < NOW())`,
          })
          .from(approvalTasks)
          .where(sql`${approvalTasks.tenantId} = ${tenantId}`),
        tx
          .select({
            last24h: sql<number>`COUNT(*) FILTER (WHERE ${pipelineErrors.createdAt} >= NOW() - INTERVAL '24 hours')`,
            critical: sql<number>`COUNT(*) FILTER (WHERE ${pipelineErrors.severity} = 'critical')`,
          })
          .from(pipelineErrors)
          .where(sql`${pipelineErrors.tenantId} = ${tenantId}`),
        tx
          .select({
            resolvedToday: sql<number>`COUNT(*) FILTER (WHERE ${approvalTasks.status} IN ('approved', 'rejected', 'cancelled', 'expired') AND DATE(${approvalTasks.decidedAt}) = CURRENT_DATE)`,
          })
          .from(approvalTasks)
          .where(sql`${approvalTasks.tenantId} = ${tenantId}`),
        tx
          .select({
            avgScore: sql<number>`AVG(${silverCompanies.totalQualityScore})`,
            eligible: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.promotionStatus} = 'eligible')`,
            blocked: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.promotionStatus} = 'blocked')`,
          })
          .from(silverCompanies)
          .where(
            sql`${silverCompanies.tenantId} = ${tenantId} AND ${silverCompanies.totalQualityScore} IS NOT NULL`,
          ),
      ]);
    });

    const queueDepth = queueDepths.reduce((sum, q) => sum + q.waiting + q.active + q.delayed, 0);
    const failingQueues = queueDepths.filter((q) => q.failed > 0).length;

    return {
      bronze: bronzeStats[0],
      silver: silverStats[0],
      gold: goldStats[0],
      approvals: approvalStats[0],
      errors: errorStats[0],
      pipeline: {
        queueDepth,
        failingQueues,
      },
      hitl: {
        pending: Number(approvalStats[0]?.pending ?? 0),
        resolvedToday: Number(hitlResolvedToday[0]?.resolvedToday ?? 0),
        overdue: Number(approvalStats[0]?.overdue ?? 0),
      },
      quality: {
        avgScore: Number(qualityStats[0]?.avgScore ?? 0),
        eligible: Number(qualityStats[0]?.eligible ?? 0),
        blocked: Number(qualityStats[0]?.blocked ?? 0),
      },
    };
  } catch (err) {
    if (isSchemaPermissionError(err)) {
      log.warn(
        { err, tenantId },
        "Dashboard stats degraded: DB role lacks schema permissions for tenant analytics tables",
      );
      return { ...ZERO_PAYLOAD };
    }
    throw err;
  }
}
