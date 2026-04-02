/**
 * C18 — ai:retry:regenerate (concurrency:5, timeout:60s)
 *
 * Gestionează retry-urile după eșecuri de guardrail:
 *  - attemptNumber >= 3: escaladare HITL cu discriminator "max-retries-exceeded"
 *  - attemptNumber < 3: construiește correctionNote din violations și re-enqueue C14
 */
import type { Processor } from "bullmq";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";

const LOG = "[c18:ai:retry:regenerate]";
const MAX_ATTEMPTS = 3;

// ── Job types ─────────────────────────────────────────────────────────────────

export interface AiRetryRegenerateJobData {
  tenantId: string;
  sessionId: string;
  conversationId: string | null;
  negotiationId: string;
  leadId: string | null;
  originalUserMessage: string | null;
  violations: Array<{ guardrail: string; violation: string }>;
  attemptNumber: number;
}

// ── Downstream queues ─────────────────────────────────────────────────────────

const orchestrateQueue = createQueue(QUEUES.E3_AI_AGENT_ORCHESTRATE);
const hitlQueue = createQueue(QUEUES.HITL_ESCALATION);

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCorrectionNote(violations: Array<{ guardrail: string; violation: string }>): string {
  const violationDetails = violations
    .map((v) => `- Guardrail ${v.guardrail.toUpperCase()}: ${v.violation}`)
    .join("\n");

  return `CORECȚIE NECESARĂ (tentativa anterioară a eșuat validarea):
${violationDetails}

Instrucțiuni de corecție:
- Verifică și corectează prețurile oferite (marja minimă 8%)
- Asigură-te că stocul menționat este corect și disponibil
- Discounturile nu trebuie să depășească limitele aprobate
- Codurile SKU menționate trebuie să fie valide
- Informațiile fiscale trebuie să fie corecte conform legislației române

Regenerează răspunsul respectând STRICT aceste constrângeri.`.trim();
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const aiRetryRegenerateProcessor: Processor<AiRetryRegenerateJobData> = async (job) => {
  const {
    tenantId,
    sessionId,
    conversationId,
    negotiationId,
    leadId,
    originalUserMessage,
    violations,
    attemptNumber,
  } = job.data;

  console.info(
    `${LOG} tenantId=${tenantId} sessionId=${sessionId} attempt=${attemptNumber} violations=${violations.length}`,
  );

  // 1. Dacă am depășit numărul maxim de retry-uri → escaladare HITL
  if (attemptNumber >= MAX_ATTEMPTS) {
    await hitlQueue.add(
      "hitl:escalate",
      {
        discriminator: "max-retries-exceeded",
        tenantId,
        sessionId,
        conversationId,
        negotiationId,
        leadId,
        violations,
        attemptNumber,
      },
      { ...DEFAULT_JOB_OPTIONS, jobId: `hitl:max-retries:${sessionId}` },
    );

    console.warn(
      `${LOG} max retries exceeded, escalated to HITL sessionId=${sessionId} attempt=${attemptNumber}`,
    );

    return { ok: true, sessionId, escalated: true, attemptNumber };
  }

  // 2. Construiește correctionNote din violations
  const correctionNote = buildCorrectionNote(violations);

  // 3. Re-enqueue C14 cu attemptNumber + 1 și correctionNote
  await orchestrateQueue.add(
    "ai:agent:orchestrate",
    {
      tenantId,
      sessionId,
      leadId,
      negotiationId,
      conversationId,
      systemPrompt: null,
      userMessage: originalUserMessage ?? "",
      conversationHistory: [],
      allowedTools: [],
      attemptNumber: attemptNumber + 1,
      correctionNote,
    },
    {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `orchestrate:retry:${sessionId}:${attemptNumber + 1}`,
    },
  );

  console.info(
    `${LOG} re-enqueued C14 for retry sessionId=${sessionId} nextAttempt=${attemptNumber + 1}`,
  );

  return {
    ok: true,
    sessionId,
    attemptNumber,
    retrying: true,
    escalated: false,
  };
};
