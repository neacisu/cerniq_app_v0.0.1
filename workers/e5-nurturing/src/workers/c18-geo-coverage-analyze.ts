/**
 * c18-geo-coverage-analyze.ts — Worker C18: Geo Coverage Analyze (Plan §X FAZA 9d)
 *
 * Queue: geo:coverage:analyze (REDIS_DB_E5=5)
 * Trigger: manual, post-geocoding batch, sau cron
 *
 * Logică:
 * - Per județ/regiune: count clienți, total revenue, penetration rate
 * - Output: coverage report JSON stocat ca job result
 * - Prometheus: e5PostgisQuerySeconds histogram cu query_type="coverage_analyze"
 */

import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";
import { getCountyCoverage } from "../lib/postgis-proximity.js";
import { e5PostgisQuerySeconds } from "../lib/e5-metrics.js";

export interface GeoCoverageAnalyzeJobData {
  tenantId: string;
  correlationId?: string;
}

export interface CountyCoverageReport {
  judetCod: string;
  clientCount: number;
  totalRevenueLei: number;
  avgRevenueLei: number;
  coverageShare: number; // procentaj din total clienți tenant
}

export interface GeoCoverageAnalyzeResult {
  ok: boolean;
  countiesAnalyzed: number;
  totalClientsWithLocation: number;
  topCounty: string | null;
  report: CountyCoverageReport[];
  generatedAt: string;
}

export function createGeoCoverageAnalyzeWorker(): Worker {
  const { worker } = createWorker<GeoCoverageAnalyzeJobData>(
    QUEUES.E5_GEO_COVERAGE_ANALYZE,
    async (job: Job<GeoCoverageAnalyzeJobData>): Promise<GeoCoverageAnalyzeResult> => {
      return withCognitiveSpan("e5:geo:coverage-analyze", async () => {
        const { tenantId } = job.data;

        const timer = e5PostgisQuerySeconds.startTimer({
          query_type: "coverage_analyze",
          tenant_id: tenantId,
        });
        const coverageRows = await getCountyCoverage(tenantId);
        timer();

        const totalClients = coverageRows.reduce((sum, r) => sum + r.clientCount, 0);

        const report: CountyCoverageReport[] = coverageRows.map((r) => ({
          judetCod: r.judetCod,
          clientCount: r.clientCount,
          totalRevenueLei: r.totalRevenue,
          avgRevenueLei: r.clientCount > 0 ? Math.round(r.totalRevenue / r.clientCount) : 0,
          coverageShare:
            totalClients > 0 ? Math.round((r.clientCount / totalClients) * 10000) / 100 : 0,
        }));

        const topCounty = report.length > 0 ? (report[0]?.judetCod ?? null) : null;

        job.log(
          `[C18] Coverage analyzed: ${coverageRows.length} counties, ${totalClients} clients with location`,
        );

        return {
          ok: true,
          countiesAnalyzed: coverageRows.length,
          totalClientsWithLocation: totalClients,
          topCounty,
          report,
          generatedAt: new Date().toISOString(),
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
    },
  );

  return worker;
}
