/**
 * K64 — sentiment:trend:analyze (CRON: "0 EVERY6H * * *", concurrency:1)
 *
 * Analizează trendul de sentiment pe 7 zile pentru toate negocierile active.
 * Dacă degradarea sentimentului este >0.3 pe ultimele 3 mesaje față de
 * precedentele 3 → trigger J56 handover:detect.
 *
 * Logică trend: avg(last 3 user messages sentimentScore) vs avg(prev 3)
 * Dacă avg(prev3) - avg(last3) > 0.3 → degradare → handover.
 *
 * CRON: '0 *\/6 * * *' (fiecare 6 ore).
 * ANTI-HALUCINARE: K64 NU face apeluri LLM — analiză pur deterministică
 * pe scorurile stocate de K61. FAZA 7l — Plan L1904.
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  goldNegotiations,
  aiConversations,
  aiConversationMessages,
  tenants,
  eq,
  and,
  desc,
  gte,
  isNotNull,
  sql,
} from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SentimentTrendAnalyzeJobData {
  /** Dacă absent → procesează TOȚI tenanții (sistem-wide CRON). */
  tenantId?: string;
  runId?: string;
}

export interface SentimentTrendAnalyzeResult {
  ok: boolean;
  runId: string;
  tenantsProcessed: number;
  negotiationsChecked: number;
  handoversTriggered: number;
  insufficientDataCount: number;
}

// ── Constante ─────────────────────────────────────────────────────────────────

const TREND_WINDOW_DAYS = 7;
const TREND_MESSAGES_PER_GROUP = 3;
const DEGRADATION_THRESHOLD = 0.3;
/** State-uri finale — negocierile în aceste stări sunt ignorate. */
const CLOSED_STATES = ["WON", "LOST", "DEAD"];

// ── Queues ────────────────────────────────────────────────────────────────────

const handoverQueue = createQueue(QUEUES.E3_HANDOVER_DETECT);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verifică dacă ultima grupă de 3 mesaje are sentiment degradat față de
 * grupele precedentele (diferență > 0.3).
 *
 * @param scores — scoruri ordonate DESC (newest first)
 */
function hasSentimentDegradation(scores: number[]): boolean {
  if (scores.length < TREND_MESSAGES_PER_GROUP * 2) {
    return false;
  }
  const last3 = scores.slice(0, TREND_MESSAGES_PER_GROUP);
  const prev3 = scores.slice(TREND_MESSAGES_PER_GROUP, TREND_MESSAGES_PER_GROUP * 2);

  const avgLast3 = last3.reduce((sum, s) => sum + s, 0) / TREND_MESSAGES_PER_GROUP;
  const avgPrev3 = prev3.reduce((sum, s) => sum + s, 0) / TREND_MESSAGES_PER_GROUP;

  return avgPrev3 - avgLast3 > DEGRADATION_THRESHOLD;
}

const CLOSED_STATES_SQL = sql.raw(CLOSED_STATES.map((s) => `'${s}'`).join(", "));

/** Fetch active negotiation IDs for a tenant. */
async function fetchActiveNegotiationIds(tenantId: string): Promise<{ id: string }[]> {
  return db
    .select({ id: goldNegotiations.id })
    .from(goldNegotiations)
    .where(
      and(
        eq(goldNegotiations.tenantId, tenantId),
        sql`${goldNegotiations.currentState} NOT IN (${CLOSED_STATES_SQL})`,
      ),
    )
    .limit(1000);
}

/** Fetch last 7 user messages with sentimentScore for a negotiation. */
async function fetchRecentSentimentScores(negotiationId: string): Promise<number[]> {
  const since = new Date(Date.now() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ sentimentScore: aiConversationMessages.sentimentScore })
    .from(aiConversationMessages)
    .innerJoin(aiConversations, eq(aiConversationMessages.conversationId, aiConversations.id))
    .where(
      and(
        eq(aiConversations.negotiationId, negotiationId),
        eq(aiConversationMessages.role, "user"),
        isNotNull(aiConversationMessages.sentimentScore),
        gte(aiConversationMessages.createdAt, since),
      ),
    )
    .orderBy(desc(aiConversationMessages.createdAt))
    .limit(7);

  return rows.map((r) => Number.parseFloat(r.sentimentScore ?? "0"));
}

/** Procesează trendul pentru un singur tenant. */
async function processTenant(
  tenantId: string,
  stats: { negotiationsChecked: number; handoversTriggered: number; insufficientDataCount: number },
): Promise<void> {
  await setSessionTenantId(tenantId);

  const negotiations = await fetchActiveNegotiationIds(tenantId);

  for (const { id: negotiationId } of negotiations) {
    stats.negotiationsChecked++;

    const scores = await fetchRecentSentimentScores(negotiationId);

    if (scores.length < TREND_MESSAGES_PER_GROUP * 2) {
      stats.insufficientDataCount++;
      continue;
    }

    if (hasSentimentDegradation(scores)) {
      await handoverQueue.add(
        "handover:detect",
        {
          tenantId,
          negotiationId,
          triggerReason: "SENTIMENT_DEGRADATION",
          sentimentContext: {
            last3Avg: scores.slice(0, 3).reduce((s, v) => s + v, 0) / 3,
            prev3Avg: scores.slice(3, 6).reduce((s, v) => s + v, 0) / 3,
          },
        },
        { ...DEFAULT_JOB_OPTIONS, priority: 2 },
      );
      stats.handoversTriggered++;
      console.info(
        `[k64:sentiment:trend] DEGRADATION negotiationId=${negotiationId} tenantId=${tenantId}`,
      );
    }
  }
}

// ── Processor ─────────────────────────────────────────────────────────────────

const LOG = "[k64:sentiment:trend:analyze]";

export const sentimentTrendAnalyzeProcessor: Processor<
  SentimentTrendAnalyzeJobData,
  SentimentTrendAnalyzeResult
> = async (job) => {
  const { tenantId, runId = `run-${Date.now()}` } = job.data;

  const stats = {
    tenantsProcessed: 0,
    negotiationsChecked: 0,
    handoversTriggered: 0,
    insufficientDataCount: 0,
  };

  console.info(`${LOG} runId=${runId} tenantId=${tenantId ?? "ALL"}`);

  if (tenantId) {
    await processTenant(tenantId, stats);
    stats.tenantsProcessed = 1;
  } else {
    // Sistem-wide: procesează toți tenanții activi
    const allTenants = await db.select({ id: tenants.id }).from(tenants).limit(10_000);

    for (const t of allTenants) {
      await processTenant(t.id, stats);
      stats.tenantsProcessed++;
    }
  }

  console.info(
    `${LOG} DONE runId=${runId} tenants=${stats.tenantsProcessed} negotiations=${stats.negotiationsChecked} handovers=${stats.handoversTriggered} insufficient=${stats.insufficientDataCount}`,
  );

  return { ok: true, runId, ...stats };
};
