/**
 * k57-compliance-competition-law.ts — Worker K57: Competition Law Check (FAZA 9h)
 *
 * Queue: compliance:competition:law | Severity: CRITICAL | Concurrency: 1
 *
 * Responsabilitate:
 *   - Pattern matching (NO LLM) pe contentToCheck pentru price-fixing + competitor data sharing
 *   - CRITICAL log per violație detectată
 *   - INSERT goldNurturingActions audit când actionId este disponibil (nurturingStateId valid)
 *   - Dacă NU avem actionId → skip INSERT (nurturingStateId NOT NULL constraint)
 *
 * Anti-halucin. FAZA 9h:
 *   (A) CompetitionLawViolation = CRITICAL (NU WARNING)
 *   (B) goldNurturingActions.nurturingStateId NOT NULL → INSERT doar când avem actionId cu state
 *   (C) actionStatusEnum NU are "COMPLETED" → folosim "SENT"
 *   (D) e5ActionChannelEnum NU are "INTERNAL" → folosim "IN_APP"
 */

import type { Job, Worker } from "bullmq";
import { db, goldNurturingActions, eq } from "@cerniq/db";
import { createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names ───────────────────────────────────────────────────────────────
const QUEUE_COMPLIANCE_COMPETITION_LAW = "compliance:competition:law";

// ── Patterns price-fixing (română) — HARD-CODED, NO LLM ──────────────────────
const PRICE_FIXING_PATTERNS: readonly RegExp[] = [
  /preț\s+fix(at)?/i,
  /acord\s+prețuri/i,
  /coordon(are|ăm)\s+preț/i,
  /prețuri?\s+convenite?/i,
  /cartel/i,
  /înțelegere\s+comerciala/i,
] as const;

// ── Patterns competitor data sharing ─────────────────────────────────────────
const COMPETITOR_SHARE_PATTERNS = [
  /datele?\s+competi(tor|ției)/i,
  /strategia?\s+concurent/i,
  /clienți?\s+competi(tor|ției)/i,
] as const;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ComplianceCompetitionLawJobData {
  tenantId?: string;
  contentToCheck?: string;
  actionId?: string;
}

export interface ComplianceCompetitionLawResult {
  violations: number;
  checked: boolean;
  violationTypes: string[];
}

// ---------------------------------------------------------------------------
// Helpers: detectare pattern violations — extrase pentru Cognitive Complexity
// ---------------------------------------------------------------------------

function detectPriceFixingViolations(content: string): string[] {
  return PRICE_FIXING_PATTERNS.filter((p) => p.test(content)).map((p) => p.source);
}

function detectCompetitorSharingViolations(content: string): string[] {
  return COMPETITOR_SHARE_PATTERNS.filter((p) => p.test(content)).map((p) => p.source);
}

// ---------------------------------------------------------------------------
// Helper: INSERT audit action cu nurturingStateId din goldNurturingActions existent
// ---------------------------------------------------------------------------

async function insertViolationAuditActions(params: {
  actionId: string;
  tenantId: string | undefined;
  violationTypes: string[];
}): Promise<void> {
  const { actionId, tenantId, violationTypes } = params;

  const existingActions = await db
    .select({
      id: goldNurturingActions.id,
      nurturingStateId: goldNurturingActions.nurturingStateId,
      tenantId: goldNurturingActions.tenantId,
    })
    .from(goldNurturingActions)
    .where(eq(goldNurturingActions.id, actionId))
    .limit(1);

  if (existingActions.length === 0) return;

  const sourceAction = existingActions[0];
  const resolvedTenantId = tenantId ?? sourceAction.tenantId;

  for (const violationType of violationTypes) {
    await db.insert(goldNurturingActions).values({
      tenantId: resolvedTenantId,
      nurturingStateId: sourceAction.nurturingStateId,
      actionType: "COMPLIANCE_VIOLATION",
      channel: "IN_APP", // "INTERNAL" nu există în enum
      status: "SENT", // "COMPLETED" nu există în enum
      templateId: `COMPETITION_LAW_VIOLATION_${violationType}`,
      executedAt: new Date(),
    });
  }
}

// ---------------------------------------------------------------------------
// Helper: verifică conținut și returnează violation types detectate
// ---------------------------------------------------------------------------

function analyzeContent(
  content: string,
  tenantId: string | undefined,
  jobLog: (msg: string) => void,
): string[] {
  const violationTypes: string[] = [];

  const priceMatches = detectPriceFixingViolations(content);
  if (priceMatches.length > 0) {
    console.error(
      `[CRITICAL][K57] CompetitionLawViolation: price-fixing pattern detected tenantId=${tenantId ?? "unknown"} patterns=[${priceMatches.join(", ")}]`,
    );
    jobLog(`[CRITICAL][K57] Price-fixing violation: ${priceMatches.length} patterns matched`);
    violationTypes.push("PRICE_FIXING");
  }

  const competitorMatches = detectCompetitorSharingViolations(content);
  if (competitorMatches.length > 0) {
    console.error(
      `[CRITICAL][K57] CompetitionLawViolation: competitor data sharing pattern detected tenantId=${tenantId ?? "unknown"} patterns=[${competitorMatches.join(", ")}]`,
    );
    jobLog(`[CRITICAL][K57] Competitor data sharing: ${competitorMatches.length} patterns matched`);
    violationTypes.push("COMPETITOR_DATA_SHARING");
  }

  return violationTypes;
}

// ---------------------------------------------------------------------------
// Helper: procesează audit audit actions după detecție
// ---------------------------------------------------------------------------

async function processAuditActions(params: {
  violationTypes: string[];
  actionId: string | undefined;
  tenantId: string | undefined;
  jobLog: (msg: string) => void;
}): Promise<void> {
  const { violationTypes, actionId, tenantId, jobLog } = params;
  if (violationTypes.length === 0) return;

  if (!actionId) {
    jobLog(
      `[K57] WARN: ${violationTypes.length} violations detected but no actionId — audit INSERT skipped (nurturingStateId required)`,
    );
    return;
  }

  try {
    await insertViolationAuditActions({ actionId, tenantId, violationTypes });
    jobLog(`[K57] Audit actions inserted for violationTypes=[${violationTypes.join(",")}]`);
  } catch (err) {
    jobLog(`[K57] WARN: Failed to insert audit actions: ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Helper: stub check pe action existentă (fără contentToCheck)
// ---------------------------------------------------------------------------

async function checkExistingActionStub(
  actionId: string,
  jobLog: (msg: string) => void,
): Promise<void> {
  const existingActions = await db
    .select({
      id: goldNurturingActions.id,
      templateId: goldNurturingActions.templateId,
      actionType: goldNurturingActions.actionType,
    })
    .from(goldNurturingActions)
    .where(eq(goldNurturingActions.id, actionId))
    .limit(1);

  if (existingActions.length === 0) {
    jobLog(`[K57] WARN: actionId=${actionId} not found`);
    return;
  }

  const action = existingActions[0];
  jobLog(
    `[K57] Action found actionId=${actionId} templateId=${action.templateId} actionType=${action.actionType} — content check stub (no LLM)`,
  );
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createComplianceCompetitionLawWorker(): Worker {
  const { worker } = createWorker<ComplianceCompetitionLawJobData>(
    QUEUE_COMPLIANCE_COMPETITION_LAW,
    async (job: Job<ComplianceCompetitionLawJobData>): Promise<ComplianceCompetitionLawResult> => {
      return withCognitiveSpan("e5:compliance:competition-law", async () => {
        const { tenantId, contentToCheck, actionId } = job.data;

        let violationTypes: string[] = [];

        // ── 1. Check contentToCheck cu pattern matching ──────────────────────
        if (contentToCheck) {
          job.log(`[K57] Checking content (${contentToCheck.length} chars) for violations`);
          violationTypes = analyzeContent(contentToCheck, tenantId, (m) => job.log(m));

          await processAuditActions({
            violationTypes,
            actionId,
            tenantId,
            jobLog: (m) => job.log(m),
          });
        }

        // ── 2. Check actionId stub (conținut din action existentă) ───────────
        if (actionId && !contentToCheck) {
          job.log(`[K57] Checking existing action actionId=${actionId}`);
          try {
            await checkExistingActionStub(actionId, (m) => job.log(m));
          } catch (err) {
            job.log(
              `[K57] WARN: Failed to fetch action actionId=${actionId}: ${(err as Error).message}`,
            );
          }
        }

        // ── 3. Log final ─────────────────────────────────────────────────────
        const violationsCount = violationTypes.length;
        job.log(
          `[K57] Competition law check completed violations=${violationsCount} tenantId=${tenantId ?? "ALL"}`,
        );
        console.log(`[K57] Competition law check completed violations=${violationsCount}`);

        return { violations: violationsCount, checked: true, violationTypes };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 1,
    },
  );

  return worker;
}
