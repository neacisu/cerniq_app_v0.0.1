/**
 * B7 — search:query:rewrite (concurrency:20, timeout:5s)
 *
 * Rescriere/expandare query folosind Qwen2.5-14B (fastClient) pe infraq.app/llm/v1/fast.
 * Include LLM Guard (local + infraq guard în producție).
 * Enqueue search:vector:execute și search:bm25:execute în PARALEL.
 */
import type { Processor } from "bullmq";
import { setSessionTenantId } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";
import { e3ScanPromptBeforeLlm } from "../lib/e3-llm-guard.js";
import { fastChat } from "../lib/llm-client.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchQueryRewriteJobData {
  tenantId: string;
  query: string;
  sessionId?: string;
  correlationId?: string;
}

interface RewriteResponse {
  rewritten: string;
  expansions: string[];
  language: "ro" | "en";
}

// ── Queues ────────────────────────────────────────────────────────────────────

const vectorQueue = createQueue(QUEUES.E3_SEARCH_VECTOR_EXECUTE);
const bm25Queue = createQueue(QUEUES.E3_SEARCH_BM25_EXECUTE);

// ── Processor ─────────────────────────────────────────────────────────────────

export const searchQueryRewriteProcessor: Processor<SearchQueryRewriteJobData> = async (job) => {
  const { tenantId, query, sessionId, correlationId } = job.data;

  await setSessionTenantId(tenantId);

  console.info(
    `[b7:query:rewrite] tenantId=${tenantId} sessionId=${sessionId ?? "none"} query="${query.slice(0, 80)}"`,
  );

  const guard = await e3ScanPromptBeforeLlm(query);
  if (guard.blocked) {
    console.warn(
      `[b7:query:rewrite] LLM Guard blocked tenantId=${tenantId} sessionId=${sessionId ?? "none"}`,
    );
    return { ok: true, blocked: true, reason: guard.reason ?? "guard_blocked" };
  }

  const systemPrompt = `Ești un asistent pentru motoare de căutare de produse românești.
Rescrie și expandează query-ul de căutare primit pentru a îmbunătăți rezultatele.
Returnează EXCLUSIV un obiect JSON valid, fără text suplimentar, cu structura:
{
  "rewritten": "<query rescris, clar și specific>",
  "expansions": ["<sinonim 1>", "<sinonim 2>", "<formă alternativă>"],
  "language": "ro"
}
Regulă: "language" este "ro" dacă query-ul este în română, "en" dacă este în engleză.`;

  let rewrittenQuery = query;
  let expansions: string[] = [];

  try {
    const raw = await fastChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      5_000,
      { tenantId },
    );

    // Parse JSON — extrage din posibilele markdown code blocks
    const cleaned = raw.replaceAll(/```(?:json)?/gi, "").trim();
    const parsed = JSON.parse(cleaned) as RewriteResponse;

    if (parsed.rewritten && typeof parsed.rewritten === "string") {
      rewrittenQuery = parsed.rewritten;
    }
    if (Array.isArray(parsed.expansions)) {
      expansions = parsed.expansions.filter((e) => typeof e === "string");
    }
  } catch (err) {
    console.warn(`[b7:query:rewrite] LLM parse failed, fallback la query original`, err);
    rewrittenQuery = query;
    expansions = [];
  }

  // Enqueue vector + BM25 în PARALEL
  const jobOptions = {
    ...DEFAULT_JOB_OPTIONS,
    jobId: `${sessionId ?? "no-session"}:${Date.now()}`,
  };

  const searchPayload = {
    tenantId,
    query: rewrittenQuery,
    sessionId: sessionId ?? `rewrite-${Date.now()}`,
    correlationId,
    limit: 20,
  };

  await Promise.all([
    vectorQueue.add("search:vector:execute", searchPayload, jobOptions),
    bm25Queue.add("search:bm25:execute", searchPayload, jobOptions),
  ]);

  console.info(
    `[b7:query:rewrite] enqueued vector+bm25 tenantId=${tenantId} sessionId=${sessionId ?? "none"}`,
  );

  return {
    ok: true,
    originalQuery: query,
    rewrittenQuery,
    expansions,
    sessionId: sessionId ?? null,
  };
};
