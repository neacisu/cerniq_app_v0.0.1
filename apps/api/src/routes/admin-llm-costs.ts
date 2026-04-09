/**
 * GET /api/v1/admin/llm-costs — Plan §XVI.B (buget LLM per tier + breakdown audit).
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import Redis from "ioredis";
import { z } from "zod";
import { and, auditLlmCalls, db, eq, gte, sql, tenants } from "@cerniq/db";
import {
  LLM_DAILY_CAP_USD,
  getLlmSpendDayUsd,
  redisLlmSpendDayKey,
  shouldDowngradeLlmToSelfHostedFast,
  type TenantLlmSpendTier,
  utcDateYmdUtc,
} from "@cerniq/worker-shared";
import { envConfig } from "../config.js";
import { requireRole } from "../middleware/authz.js";

const querySchema = z.object({
  tenantId: z.uuid(),
  period: z.enum(["today", "week", "month"]).default("today"),
  tier: z.enum(["SMALL", "MEDIUM", "ENTERPRISE"]).optional(),
});

const tierFromSettingsSchema = z.enum(["SMALL", "MEDIUM", "ENTERPRISE"]);

function tierFromTenantSettings(settings: unknown): TenantLlmSpendTier {
  if (!settings || typeof settings !== "object") return "SMALL";
  const o = settings as Record<string, unknown>;
  const a = tierFromSettingsSchema.safeParse(o.llmSpendTier ?? o.llmTier);
  if (a.success) return a.data;
  const billing = o.billing;
  if (billing && typeof billing === "object") {
    const b = tierFromSettingsSchema.safeParse((billing as Record<string, unknown>).llmTier);
    if (b.success) return b.data;
  }
  return "SMALL";
}

function periodWindow(period: "today" | "week" | "month"): { start: Date; days: number } {
  const now = new Date();
  if (period === "today") {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
    );
    return { start, days: 1 };
  }
  if (period === "week") {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 6);
    start.setUTCHours(0, 0, 0, 0);
    return { start, days: 7 };
  }
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 29);
  start.setUTCHours(0, 0, 0, 0);
  return { start, days: 30 };
}

async function sumRedisSpendDays(
  redis: Pick<Redis, "get">,
  tenantId: string,
  startUtc: Date,
  numDays: number,
): Promise<number> {
  let sum = 0;
  for (let i = 0; i < numDays; i++) {
    const d = new Date(startUtc);
    d.setUTCDate(d.getUTCDate() + i);
    const ymd = d.toISOString().slice(0, 10);
    const key = redisLlmSpendDayKey(tenantId, ymd);
    const v = await redis.get(key);
    sum += v ? Number.parseFloat(v) : 0;
  }
  return sum;
}

let redisSingleton: Redis | null = null;

function getAdminRedis(): Redis {
  if (!redisSingleton) {
    redisSingleton = new Redis(envConfig.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redisSingleton.on("error", () => {});
  }
  return redisSingleton;
}

export async function adminLlmCostsRoutes(app: FastifyInstance) {
  const adminAuth = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("admin")],
  };

  app.get("/llm-costs", { ...adminAuth }, async (req, reply) => {
    const q = querySchema.parse(req.query);
    const redis = getAdminRedis();
    await redis.connect().catch(() => undefined);

    const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, q.tenantId)).limit(1);
    if (!tenantRow) {
      return reply.status(404).send({ success: false, error: "tenant_not_found" });
    }

    const tier = q.tier ?? tierFromTenantSettings(tenantRow.settings);
    const cap = LLM_DAILY_CAP_USD[tier];
    const { start, days } = periodWindow(q.period);

    const totalCost = await sumRedisSpendDays(redis, q.tenantId, start, days);

    const todayYmd = utcDateYmdUtc();
    const todaySpendUsd = await getLlmSpendDayUsd(redis, q.tenantId, todayYmd);
    const downgradeRecommended = shouldDowngradeLlmToSelfHostedFast({
      spentUsdDay: todaySpendUsd,
      tier,
    });

    const breakdownRows = await db
      .select({
        model: auditLlmCalls.modelUsed,
        totalUsd: sql<string>`coalesce(sum(${auditLlmCalls.costUsd}), 0)::text`,
      })
      .from(auditLlmCalls)
      .where(and(eq(auditLlmCalls.tenantId, q.tenantId), gte(auditLlmCalls.createdAt, start)))
      .groupBy(auditLlmCalls.modelUsed);

    const breakdown_by_model = breakdownRows.map((r) => ({
      model: r.model,
      total_usd: Number.parseFloat(r.totalUsd),
    }));

    const budgetWindowUsd = cap * days;
    const usage_percent =
      budgetWindowUsd > 0 ? Math.min(100, (totalCost / budgetWindowUsd) * 100) : 0;

    return reply.send({
      success: true,
      data: {
        tenantId: q.tenantId,
        tier,
        period: q.period,
        periodDays: days,
        totalCost,
        cap,
        usage_percent,
        todaySpendUsd,
        downgradeRecommended,
        breakdown_by_model,
      },
    });
  });
}
