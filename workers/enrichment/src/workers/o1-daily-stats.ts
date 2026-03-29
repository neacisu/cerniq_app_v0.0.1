import type { Processor } from "bullmq";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import {
  approvalTasks,
  bronzeContacts,
  dailyStats,
  db,
  goldCompanies,
  setSessionTenantId,
  silverCompanies,
  sql,
} from "@cerniq/db";

export type DailyStatsJobData = {
  tenantId: string;
  date?: string;
  correlationId?: string;
};

export const dailyStatsProcessor: Processor<DailyStatsJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:aggregate:daily-stats",
    async (_span) => {
      await setSessionTenantId(job.data.tenantId);
      const targetDate = job.data.date ? new Date(job.data.date) : new Date();
      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);

      const tenantId = job.data.tenantId;

      const [bronzeStats, silverStats, goldStats, hitlStats] = await Promise.all([
        db
          .select({
            total: sql<number>`COUNT(*)`,
            todayInserted: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.createdAt} >= ${start})`,
          })
          .from(bronzeContacts)
          .where(sql`${bronzeContacts.tenantId} = ${tenantId}`),

        db
          .select({
            total: sql<number>`COUNT(*)`,
            avgQuality: sql<number>`COALESCE(AVG(CAST(${silverCompanies.totalQualityScore} AS double precision)), 0)`,
            enrichComplete: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.enrichmentStatus} = 'complete')`,
            enrichFailed: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.enrichmentStatus} = 'failed')`,
            enrichInProgress: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.enrichmentStatus} = 'in_progress')`,
            dedupPending: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.dedupStatus} = 'hitl_pending')`,
          })
          .from(silverCompanies)
          .where(sql`${silverCompanies.tenantId} = ${tenantId}`),

        db
          .select({
            total: sql<number>`COUNT(*)`,
          })
          .from(goldCompanies)
          .where(sql`${goldCompanies.tenantId} = ${tenantId}`),

        db
          .select({
            pending: sql<number>`COUNT(*) FILTER (WHERE ${approvalTasks.status} = 'pending')`,
            resolved: sql<number>`COUNT(*) FILTER (WHERE ${approvalTasks.status} IN ('approved', 'rejected'))`,
          })
          .from(approvalTasks)
          .where(sql`${approvalTasks.tenantId} = ${tenantId}`),
      ]);

      const silverTotal = Number(silverStats[0]?.total ?? 0);
      const avgQuality = Number(silverStats[0]?.avgQuality ?? 0);
      const enrichmentJobsCompleted = Number(silverStats[0]?.enrichComplete ?? 0);
      const enrichmentJobsFailed = Number(silverStats[0]?.enrichFailed ?? 0);
      const hitlPending = Number(hitlStats[0]?.pending ?? 0);
      const bronzeTotal = Number(bronzeStats[0]?.total ?? 0);
      const goldTotal = Number(goldStats[0]?.total ?? 0);

      await db
        .insert(dailyStats)
        .values({
          tenantId,
          statDate: start,
          pipelineStage: "E1",
          bronzeTotal,
          silverTotal,
          goldTotal,
          avgQualityScore: String(avgQuality.toFixed(2)),
          hitlPending,
          hitlCompleted: Number(hitlStats[0]?.resolved ?? 0),
          enrichmentJobsCompleted,
          enrichmentJobsFailed,
        })
        .onConflictDoUpdate({
          target: [dailyStats.tenantId, dailyStats.statDate, dailyStats.pipelineStage],
          set: {
            bronzeTotal,
            silverTotal,
            goldTotal,
            avgQualityScore: String(avgQuality.toFixed(2)),
            hitlPending,
            hitlCompleted: Number(hitlStats[0]?.resolved ?? 0),
            enrichmentJobsCompleted,
            enrichmentJobsFailed,
          },
        });

      return {
        ok: true,
        status: "success",
        date: start.toISOString(),
        bronzeTotal,
        silverTotal,
        goldTotal,
        avgQuality,
        enrichmentJobsCompleted,
        enrichmentJobsFailed,
        hitlPending,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
