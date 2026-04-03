/**
 * i50-content-template-render.ts — Worker I50: Content Template Render (FAZA 9h)
 *
 * Queue: content:template:render | Concurrency: 10
 *
 * Responsabilitate:
 *   - Randează template predefinit (NO LLM) cu interpolație simplă de string-uri
 *   - Variabile disponibile: {{clientName}}, {{totalRevenue}}, {{lastOrderDate}},
 *     {{currentState}}, {{dripName}}
 *   - UPDATE goldNurturingActions status → SENT după dispatch
 *   - Enqueue OUTREACH_ORCHESTRATOR_DISPATCH cu conținut randat
 *
 * Anti-halucin. FAZA 9h:
 *   (F) NU genera conținut cu LLM — template-uri HARD-CODED cu interpolare string-uri
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldNurturingState,
  goldNurturingActions,
  goldContentDrips,
  goldCompanies,
  eq,
  and,
  setSessionTenantId,
} from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan, QUEUES } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Queue names (hardcodate)
// ---------------------------------------------------------------------------

const QUEUE_CONTENT_TEMPLATE_RENDER = "content:template:render";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface TemplateRenderJobData {
  tenantId: string;
  leadId: string;
  actionId: string;
  templateId: string;
  channel: "EMAIL" | "WHATSAPP";
}

export interface TemplateRenderResult {
  ok: boolean;
  skipped?: boolean;
  renderedTemplateId?: string;
}

// ---------------------------------------------------------------------------
// Template-uri predefinite (HARD-CODED — NO LLM)
// Variabile disponibile: {{clientName}}, {{totalRevenue}}, {{lastOrderDate}},
//                        {{currentState}}, {{dripName}}
// ---------------------------------------------------------------------------

/** Template-uri predefinite HARD-CODED — modificările necesită redeploy (NO dynamic/LLM content) */
const TEMPLATES: Readonly<Record<string, { readonly subject?: string; readonly body: string }>> = {
  WELCOME_SEQUENCE: {
    subject: "Bun venit în comunitatea Cerniq!",
    body: "Dragă {{clientName}}, bun venit! Explorează portofoliul nostru de produse agricole.",
  },
  NURTURING_ACTIVE: {
    subject: "Actualizări pentru ferma dumneavoastră",
    body: "Dragă {{clientName}}, avem noi produse și servicii disponibile. Ultima dvs. comandă: {{lastOrderDate}}.",
  },
  LOYAL_REWARD: {
    subject: "Mulțumim pentru loialitate!",
    body: "Dragă {{clientName}}, datorită parteneriatelor de {{totalRevenue}} RON, beneficiați de ofertă specială.",
  },
  NPS_SURVEY: {
    subject: "Ne interesează opinia dvs.",
    body: "Dragă {{clientName}}, pe o scară de la 0 la 10, cât de probabil e să ne recomandați?",
  },
  COMPLAINT_ACK_MODERATE: {
    subject: "Am primit feedback-ul dvs.",
    body: "Dragă {{clientName}}, am înregistrat feedback-ul dvs. și vom reveni în cel mai scurt timp.",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTemplate(body: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val), body);
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createContentTemplateRenderWorker(): Worker {
  const outreachQueue = createQueue(QUEUES.OUTREACH_ORCHESTRATOR_DISPATCH, { db: 5 });

  const { worker } = createWorker<TemplateRenderJobData>(
    QUEUE_CONTENT_TEMPLATE_RENDER,
    async (job: Job<TemplateRenderJobData>): Promise<TemplateRenderResult> => {
      return withCognitiveSpan("e5:content:template-render", async () => {
        const { tenantId, leadId, actionId, templateId, channel } = job.data;

        await setSessionTenantId(tenantId);

        job.log(
          `[I50] Template render: leadId=${leadId} templateId=${templateId} channel=${channel}`,
        );

        // ── 1. Verifică template există ───────────────────────────────────
        const template = TEMPLATES[templateId];

        if (!template) {
          console.warn(`[I50] Template not found: templateId=${templateId} — marking SKIPPED`);

          await db
            .update(goldNurturingActions)
            .set({ status: "SKIPPED", updatedAt: new Date() })
            .where(
              and(
                eq(goldNurturingActions.id, actionId),
                eq(goldNurturingActions.tenantId, tenantId),
              ),
            );

          return { ok: true, skipped: true };
        }

        // ── 2. SELECT acțiunea pentru nurturingStateId ────────────────────
        const actionRows = await db
          .select({
            nurturingStateId: goldNurturingActions.nurturingStateId,
          })
          .from(goldNurturingActions)
          .where(
            and(eq(goldNurturingActions.id, actionId), eq(goldNurturingActions.tenantId, tenantId)),
          )
          .limit(1);

        if (actionRows.length === 0) {
          throw new Error(`[I50] Action not found: actionId=${actionId}`, { cause: "NOT_FOUND" });
        }

        // ── 3. SELECT client info: goldNurturingState + goldCompanies ─────
        const clientRows = await db
          .select({
            currentState: goldNurturingState.currentState,
            totalRevenue: goldNurturingState.totalRevenue,
            daysSinceLastOrder: goldNurturingState.daysSinceLastOrder,
            denumire: goldCompanies.denumire,
            denumireComerciala: goldCompanies.denumireComerciala,
          })
          .from(goldNurturingState)
          .innerJoin(goldCompanies, eq(goldNurturingState.leadId, goldCompanies.id))
          .where(
            and(eq(goldNurturingState.leadId, leadId), eq(goldNurturingState.tenantId, tenantId)),
          )
          .limit(1);

        if (clientRows.length === 0) {
          throw new Error(`[I50] Client state not found: leadId=${leadId}`, {
            cause: "NOT_FOUND",
          });
        }

        const clientInfo = clientRows[0];

        // ── 4. SELECT dripName din goldContentDrips ───────────────────────
        const dripRows = await db
          .select({ name: goldContentDrips.name })
          .from(goldContentDrips)
          .where(
            and(
              eq(goldContentDrips.tenantId, tenantId),
              eq(goldContentDrips.templateId, templateId),
            ),
          )
          .limit(1);

        const dripName = dripRows[0]?.name ?? templateId;

        // ── 5. Construiește variabilele template ──────────────────────────
        const clientName = clientInfo.denumire ?? clientInfo.denumireComerciala ?? "Client";

        const lastOrderDate =
          clientInfo.daysSinceLastOrder === null || clientInfo.daysSinceLastOrder === undefined
            ? "N/A"
            : new Date(Date.now() - clientInfo.daysSinceLastOrder * 86_400_000).toLocaleDateString(
                "ro-RO",
              );

        const templateVars: Record<string, string> = {
          clientName,
          totalRevenue: String(clientInfo.totalRevenue ?? "0"),
          lastOrderDate,
          currentState: clientInfo.currentState,
          dripName,
        };

        // ── 6. Randează template ──────────────────────────────────────────
        const renderedBody = renderTemplate(template.body, templateVars);
        const renderedSubject = template.subject
          ? renderTemplate(template.subject, templateVars)
          : undefined;

        // ── 7. Enqueue OUTREACH_ORCHESTRATOR_DISPATCH ─────────────────────
        await outreachQueue.add(
          "outreach-dispatch-content-drip",
          {
            tenantId,
            leadId,
            channel,
            templateId,
            subject: renderedSubject,
            body: renderedBody,
          },
          {
            jobId: `outreach-dispatch-${actionId}`,
          },
        );

        // ── 8. UPDATE status → SENT (dispatched la orchestrator) ──────────
        await db
          .update(goldNurturingActions)
          .set({ status: "SENT", updatedAt: new Date() })
          .where(
            and(eq(goldNurturingActions.id, actionId), eq(goldNurturingActions.tenantId, tenantId)),
          );

        job.log(`[I50] Template rendered leadId=${leadId} templateId=${templateId}`);

        return { ok: true, renderedTemplateId: templateId };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 10,
    },
  );

  return worker;
}
