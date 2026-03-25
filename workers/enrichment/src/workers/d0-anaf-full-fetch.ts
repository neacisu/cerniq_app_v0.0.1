import type { Job } from "bullmq";
import type Redis from "ioredis";
import {
  beginImportRuntimeJob,
  completeImportRuntimeJob,
  createWorker,
  failImportRuntimeJob,
  QUEUES,
  sanitizeCui,
  withExternalApiMetrics,
} from "@cerniq/worker-shared";
import { fetchAnafSingleByCui, type AnafV9CompanyRecord } from "../lib/anaf-api-client.js";

const CACHE_TTL_SEC = 300;

function anafFullCacheKey(tenantId: string, cui: string): string {
  return `anaf:cache:${tenantId}:${cui}`;
}

export type AnafFullFetchJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export function createAnafFullFetchWorker(redis: Redis) {
  const { worker, observeDuration } = createWorker<AnafFullFetchJobData>(
    QUEUES.ENRICH_ANAF_FULL,
    async (job: Job<AnafFullFetchJobData>) => {
      const startedAt = Date.now();
      try {
        const runtime = await beginImportRuntimeJob(
          QUEUES.ENRICH_ANAF_FULL,
          job,
          QUEUES.ENRICH_ANAF_FULL,
        );
        if (runtime.paused) {
          return { ok: true, status: "paused" as const };
        }

        const { tenantId, companyId, cui } = job.data;
        const cleanedCui = sanitizeCui(cui);
        const key = anafFullCacheKey(tenantId, cleanedCui);

        const cachedRaw = await redis.get(key);
        if (cachedRaw !== null) {
          try {
            const data = JSON.parse(cachedRaw) as AnafV9CompanyRecord | null;
            const result = {
              ok: true as const,
              cached: true as const,
              tenantId,
              companyId,
              cui: cleanedCui,
              data,
            };
            await completeImportRuntimeJob(job, result as Record<string, unknown>);
            return result;
          } catch {
            // Corrupt cache entry — refetch below
          }
        }

        const record = await withExternalApiMetrics("anaf", () => fetchAnafSingleByCui(cleanedCui));
        await redis.set(key, JSON.stringify(record), "EX", CACHE_TTL_SEC);

        const result = {
          ok: true as const,
          cached: false as const,
          tenantId,
          companyId,
          cui: cleanedCui,
          data: record,
        };
        await completeImportRuntimeJob(job, result as Record<string, unknown>);
        return result;
      } catch (error) {
        await failImportRuntimeJob(job, error);
        throw error;
      } finally {
        observeDuration(startedAt);
      }
    },
    { connection: redis, concurrency: 5 },
  );

  worker.on("error", (err: Error) => {
    console.error(`[worker:${QUEUES.ENRICH_ANAF_FULL}]`, err);
  });

  return worker;
}
