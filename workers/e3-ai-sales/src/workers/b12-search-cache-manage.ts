/**
 * B12 — search:cache:manage (concurrency:10)
 *
 * Cache Redis pentru rezultate search cu TTL 5 minute.
 * Cache key: sha256(tenantId + ':' + query + ':' + JSON.stringify(filters_sorted))
 * Redis key: e3:search:cache:{cacheKey}
 */
import type { Processor } from "bullmq";
import { createHash } from "node:crypto";
import Redis from "ioredis";
import { setSessionTenantId } from "@cerniq/db";
import { getRedisConnectionOptions } from "@cerniq/worker-shared";
import type { FusedResult } from "./b10-search-rrf-fuse.js";
import type { SearchFilters } from "./b11-search-filter-apply.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchCacheManageJobData {
  action: "get" | "set" | "invalidate";
  tenantId: string;
  query?: string;
  filters?: SearchFilters;
  results?: FusedResult[];
  ttlSeconds?: number;
}

// ── Redis — lazy singleton ────────────────────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis {
  _redis ??= new Redis(getRedisConnectionOptions());
  return _redis;
}

const CACHE_PREFIX = "e3:search:cache:";
const DEFAULT_TTL = 300;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCacheKey(tenantId: string, query: string, filters?: SearchFilters): string {
  const sortedFilters = filters
    ? JSON.stringify(
        Object.fromEntries(
          Object.entries(filters)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b)),
        ),
      )
    : "{}";

  const raw = `${tenantId}:${query}:${sortedFilters}`;
  return createHash("sha256").update(raw).digest("hex");
}

async function handleCacheGet(
  redis: Redis,
  tenantId: string,
  query: string | undefined,
  filters: SearchFilters | undefined,
): Promise<Record<string, unknown>> {
  if (!query) throw new Error("b12: action=get requires query");

  const cacheKey = buildCacheKey(tenantId, query, filters);
  const redisKey = `${CACHE_PREFIX}${tenantId}:${cacheKey}`;
  const cached = await redis.get(redisKey);

  if (cached) {
    console.info(
      `[b12:cache:manage] cache HIT tenantId=${tenantId} key=${cacheKey.slice(0, 12)}...`,
    );
    return {
      ok: true,
      action: "get",
      hit: true,
      results: JSON.parse(cached) as FusedResult[],
      cacheKey,
    };
  }

  console.info(
    `[b12:cache:manage] cache MISS tenantId=${tenantId} key=${cacheKey.slice(0, 12)}...`,
  );
  return { ok: true, action: "get", hit: false, cacheKey };
}

async function handleCacheSet(
  redis: Redis,
  tenantId: string,
  query: string | undefined,
  filters: SearchFilters | undefined,
  results: FusedResult[] | undefined,
  ttlSeconds: number,
): Promise<Record<string, unknown>> {
  if (!query) throw new Error("b12: action=set requires query");
  if (!results) throw new Error("b12: action=set requires results");

  const cacheKey = buildCacheKey(tenantId, query, filters);
  const redisKey = `${CACHE_PREFIX}${tenantId}:${cacheKey}`;

  await redis.set(redisKey, JSON.stringify(results), "EX", ttlSeconds);
  console.info(
    `[b12:cache:manage] cache SET tenantId=${tenantId} key=${cacheKey.slice(0, 12)}... ttl=${ttlSeconds}s`,
  );

  return { ok: true, action: "set", cacheKey };
}

async function handleCacheInvalidate(
  redis: Redis,
  tenantId: string,
  query: string | undefined,
  filters: SearchFilters | undefined,
): Promise<Record<string, unknown>> {
  if (query) {
    const cacheKey = buildCacheKey(tenantId, query, filters);
    const redisKey = `${CACHE_PREFIX}${tenantId}:${cacheKey}`;
    await redis.del(redisKey);
    console.info(
      `[b12:cache:manage] invalidated specific key tenantId=${tenantId} key=${cacheKey.slice(0, 12)}...`,
    );
    return { ok: true, action: "invalidate", cacheKey };
  }

  // Invalidare bulk — NUMAI pentru tenant-ul curent (izolare multi-tenant)
  let cursor = "0";
  let deleted = 0;
  const pattern = `${CACHE_PREFIX}${tenantId}:*`;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== "0");

  console.info(`[b12:cache:manage] invalidated pattern tenantId=${tenantId} deleted=${deleted}`);
  return { ok: true, action: "invalidate", cacheKey: `${tenantId}:*` };
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const searchCacheManageProcessor: Processor<SearchCacheManageJobData> = async (job) => {
  const { action, tenantId, query, filters, results, ttlSeconds = DEFAULT_TTL } = job.data;

  await setSessionTenantId(tenantId);

  console.info(`[b12:cache:manage] action=${action} tenantId=${tenantId}`);

  const redis = getRedis();

  if (action === "get") return handleCacheGet(redis, tenantId, query, filters);
  if (action === "set") return handleCacheSet(redis, tenantId, query, filters, results, ttlSeconds);
  if (action === "invalidate") return handleCacheInvalidate(redis, tenantId, query, filters);

  throw new Error(`b12: acțiune necunoscută: ${String(action)}`);
};
