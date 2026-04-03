/**
 * h46-feedback-complaint-route.ts — Worker H46: Complaint Routing (Plan §X FAZA 9h)
 *
 * Queue: feedback:complaint:route | Timeout: 30s | Concurrency: 10 | Redis DB: 5
 *
 * Responsabilitate:
 *   - Rutează plângeri pe baza scorului NPS:
 *     - score ≤ 3 (sever): route=HITL → hitl:complaint:review
 *     - score 4-6 (moderat): route=AUTO → outreach:orchestrator:dispatch
 *   - INSERT goldNurturingActions cu acțiunea de rutare
 *
 * Anti-halucinare FAZA 9h:
 *   (A) goldNurturingActions.channel NU permite "INTERNAL" — enum: EMAIL|WHATSAPP|SMS|PHONE|IN_APP
 *       → Pentru rutele HITL, se folosește "IN_APP" (comunicare internă)
 *   (B) goldNurturingActions.nurturingStateId este NOT NULL — se fetch-uiește din goldNurturingState
 *   (C) templateId este null pentru HITL (nu există template de trimis extern)
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldNurturingState,
  goldNurturingActions,
  eq,
  and,
  setSessionTenantId,
} from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names ──────────────────────────────────────────────────────────────
const QUEUE_COMPLAINT_ROUTE = "feedback:complaint:route";
const QUEUE_HITL_COMPLAINT = "hitl:complaint:review";
const QUEUE_OUTREACH_DISPATCH = "outreach:orchestrator:dispatch";

// ── Timeout job BullMQ ───────────────────────────────────────────────────────
const JOB_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ComplaintRouteJobData {
  tenantId: string;
  leadId: string;
  surveyId: string;
  score: number;
  comment?: string;
  complaintType?: "QUALITY" | "DELIVERY" | "PRICE" | "SERVICE" | "OTHER";
}

type RouteDecision = "HITL" | "AUTO";

export interface ComplaintRouteResult {
  ok: boolean;
  route: RouteDecision;
  nurturingStateId: string | null;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createFeedbackComplaintRouteWorker(): Worker {
  const hitlQueue = createQueue(QUEUE_HITL_COMPLAINT, { db: 5 });
  const outreachQueue = createQueue(QUEUE_OUTREACH_DISPATCH, { db: 5 });

  const { worker } = createWorker<ComplaintRouteJobData>(
    QUEUE_COMPLAINT_ROUTE,
    async (job: Job<ComplaintRouteJobData>): Promise<ComplaintRouteResult> => {
      return withCognitiveSpan("e5:feedback:complaint:route", async () => {
        const { tenantId, leadId, surveyId, score, comment, complaintType } = job.data;

        await setSessionTenantId(tenantId);

        // ── 1. Validare score ────────────────────────────────────────────────
        if (!Number.isInteger(score) || score < 0 || score > 10) {
          throw new Error(`[H46] Score invalid: ${String(score)} — trebuie să fie integer 0-10`, {
            cause: new RangeError("NPS score out of range [0, 10]"),
          });
        }

        job.log(
          `[H46] Complaint routing: leadId=${leadId} score=${score} type=${complaintType ?? "N/A"}`,
        );

        // ── 2. Determină ruta ────────────────────────────────────────────────
        const route: RouteDecision = score <= 3 ? "HITL" : "AUTO";

        if (route === "HITL") {
          // score ≤ 3 (sever)
          await hitlQueue.add(
            "complaint-hitl-review",
            {
              tenantId,
              leadId,
              surveyId,
              score,
              comment,
              urgency: "HIGH",
            },
            { jobId: `hitl-complaint-${surveyId}` },
          );
          job.log(`[H46] HITL route → enqueued hitl:complaint:review urgency=HIGH`);
        } else {
          // score 4-6 (moderat)
          await outreachQueue.add(
            "complaint-ack-moderate",
            {
              tenantId,
              leadId,
              channel: "EMAIL",
              templateId: "COMPLAINT_ACK_MODERATE",
              context: { score, comment },
            },
            { jobId: `complaint-ack-${surveyId}` },
          );
          job.log(`[H46] AUTO route → enqueued outreach COMPLAINT_ACK_MODERATE`);
        }

        // ── 3. Fetch nurturingStateId (NOT NULL constraint pe goldNurturingActions) ─
        const stateRows = await db
          .select({ id: goldNurturingState.id })
          .from(goldNurturingState)
          .where(
            and(eq(goldNurturingState.tenantId, tenantId), eq(goldNurturingState.leadId, leadId)),
          )
          .limit(1);

        const nurturingStateId = stateRows[0]?.id ?? null;

        if (!nurturingStateId) {
          job.log(
            `[H46] WARN: goldNurturingState nu există pentru leadId=${leadId} — skip INSERT action`,
          );
          job.log(`[H46] Complaint routed leadId=${leadId} score=${score} route=${route}`);
          return { ok: true, route, nurturingStateId: null };
        }

        // ── 4. INSERT goldNurturingActions ───────────────────────────────────
        // Notă: "INTERNAL" nu există în e5ActionChannelEnum → se folosește "IN_APP" pentru HITL
        await db.insert(goldNurturingActions).values({
          tenantId,
          nurturingStateId,
          actionType: "COMPLAINT_ROUTE",
          channel: route === "HITL" ? "IN_APP" : "EMAIL",
          status: "PENDING",
          templateId: route === "HITL" ? null : "COMPLAINT_ACK_MODERATE",
        });

        job.log(`[H46] Complaint routed leadId=${leadId} score=${score} route=${route}`);

        return { ok: true, route, nurturingStateId };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 10,
      lockDuration: JOB_TIMEOUT_MS,
    },
  );

  return worker;
}
