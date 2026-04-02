/**
 * A5 — revolut:balance:sync (cron la fiecare 30 minute)
 *
 * Responsabilitate (plan §IX A5, §XII L2123):
 * - GET Revolut API /accounts — fetch toate conturile business
 * - Comparare cu ultimul snapshot din Redis (TTL 35min)
 * - Alertă consolă dacă diferență > threshold configurat
 * - Stocare snapshot nou în Redis (TTL 35min = 2100s)
 * - Actualizare gauge cerniq_etapa4_revolut_balance per cont
 *
 * Redis DB: REDIS_DB_E4=4 (plan §XIV L2762)
 * Snapshot key pattern: revolut:balance:snapshot:{accountId}
 * Cron pattern: "0,30 * * * *" (la ora xx:00 și xx:30)
 */
import type { Processor } from "bullmq";
import type { Redis } from "ioredis";
import { getRevolutAccounts } from "../lib/revolut-client.js";
import { e4RevolutBalanceGauge } from "../e4-metrics.js";

export type BalanceSyncJobData = Record<string, never>;

export type BalanceSyncResult = {
  ok: true;
  accountsSynced: number;
  alerts: Array<{ accountId: string; currency: string; prev: number; curr: number; diff: number }>;
  tenantId?: string;
};

const SNAPSHOT_TTL_SECONDS = 2100; // 35 minute
const BALANCE_ALERT_THRESHOLD_PCT = 20; // alertă la diferență >20%

/**
 * Cheie Redis pentru snapshot sold.
 * Pattern: revolut:balance:snapshot:{accountId}
 */
function snapshotKey(accountId: string): string {
  return `revolut:balance:snapshot:${accountId}`;
}

/**
 * Creează un processor A5 cu Redis injectat din bootstrap.
 * Redis este necesar pentru cache snapshot sold (TTL 35min).
 */
export function createA5Processor(redis: Redis): Processor<BalanceSyncJobData> {
  return async (job): Promise<BalanceSyncResult> => {
    // ── 1. Fetch conturi Revolut Business ────────────────────────────────────
    const accounts = await getRevolutAccounts();
    const tenantId = process.env.REVOLUT_TENANT_ID?.trim();

    const alerts: BalanceSyncResult["alerts"] = [];

    // ── 2. Per cont: compare snapshot + update gauge ─────────────────────────
    for (const account of accounts) {
      if (account.state !== "active") continue;

      const prevRaw = await redis.get(snapshotKey(account.id));
      const prevBalance = prevRaw === null ? null : Number.parseFloat(prevRaw);
      const currBalance = account.balance;

      // Alertă dacă diferența față de snapshot anterior depășește threshold
      if (prevBalance !== null && prevBalance > 0) {
        const diffAbs = Math.abs(currBalance - prevBalance);
        const diffPct = (diffAbs / prevBalance) * 100;

        if (diffPct > BALANCE_ALERT_THRESHOLD_PCT) {
          const alertMsg = `[A5] ALERT: Revolut account ${account.id} (${account.currency}) balance changed by ${diffPct.toFixed(1)}%: ${prevBalance} → ${currBalance}`;
          console.warn(alertMsg);
          job.log(alertMsg);
          alerts.push({
            accountId: account.id,
            currency: account.currency,
            prev: prevBalance,
            curr: currBalance,
            diff: currBalance - prevBalance,
          });
        }
      }

      // Actualizează snapshot în Redis (TTL 35min)
      await redis.set(snapshotKey(account.id), String(currBalance), "EX", SNAPSHOT_TTL_SECONDS);

      // Actualizează gauge Prometheus
      e4RevolutBalanceGauge.set(
        {
          account_id: account.id,
          currency: account.currency,
          tenant_id: tenantId ?? "unknown",
        },
        currBalance,
      );
    }

    job.log(
      `[A5] Synced ${accounts.filter((a) => a.state === "active").length} accounts, ${alerts.length} alerts`,
    );

    return {
      ok: true,
      accountsSynced: accounts.filter((a) => a.state === "active").length,
      alerts,
      tenantId,
    };
  };
}
