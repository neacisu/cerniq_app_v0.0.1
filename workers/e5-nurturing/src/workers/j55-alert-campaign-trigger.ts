/**
 * j55-alert-campaign-trigger.ts — Worker J55: Declanșare Campanie Alertă (FAZA 9h)
 *
 * Queue: alerts:campaign:trigger | Concurrency: 10 | Redis DB: 5
 *
 * Responsabilitate:
 *   - SELECT goldNurturingState WHERE tenantId+leadId
 *   - Render template alertă (interpolate {{county}}, {{validUntil}})
 *   - INSERT goldNurturingActions cu status=PENDING, actionType=WEATHER_ALERT
 *   - Enqueue outreach:orchestrator:dispatch
 *
 * Anti-halucin. FAZA 9h:
 *   (A) goldNurturingActions.nurturingStateId este NOT NULL — necesar state.id
 *   (B) actionStatusEnum: PENDING/SENT/DELIVERED/FAILED/SKIPPED (NU "COMPLETED")
 *   (C) e5ActionChannelEnum: EMAIL/WHATSAPP/SMS/PHONE/IN_APP (NU "INTERNAL")
 *   (D) Template fallback pentru alertType necunoscut
 */

import type { Job, Worker } from "bullmq";
import { db, goldNurturingState, goldNurturingActions, eq, and } from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names ───────────────────────────────────────────────────────────────
const QUEUE_ALERTS_CAMPAIGN_TRIGGER = "alerts:campaign:trigger";
const QUEUE_OUTREACH_ORCHESTRATOR_DISPATCH = "outreach:orchestrator:dispatch";

// ── Templates statice per alertType ──────────────────────────────────────────
const ALERT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  FROST: {
    subject: "Alertă îngheț în județul dvs.",
    body: "Atenție: alertă meteorologică de îngheț în {{county}}. Protejați culturile!",
  },
  DROUGHT: {
    subject: "Alertă secetă în județul dvs.",
    body: "Alertă secetă în {{county}}. Verificați sistemele de irigații.",
  },
  HEAVY_RAIN: {
    subject: "Alertă ploi torențiale",
    body: "Ploi torențiale prognozate în {{county}}. Asigurați recolta!",
  },
  HAIL: {
    subject: "Alertă grindină",
    body: "Risc de grindină în {{county}}. Luați măsuri de protecție!",
  },
  WIND: {
    subject: "Alertă vânt puternic",
    body: "Atenție la vânt puternic în {{county}}. Asigurați echipamentele agricole!",
  },
  OTHER: {
    subject: "Alertă meteorologică în județul dvs.",
    body: "Alertă meteorologică în {{county}}. Monitorizați condițiile atmosferice.",
  },
  APIA_SAPS_DEADLINE: {
    subject: "Termen cereri SAPS — acțiune necesară",
    body: "Termenul pentru depunerea cererilor SAPS se apropie. Asigurați-vă că documentația este completă.",
  },
  APIA_PAYMENT_PERIOD: {
    subject: "Plăți APIA — verificare dosar",
    body: "Plățile APIA sunt în curs. Verificați statusul dosarului dvs.",
  },
  APIA_CONTESTATION_PERIOD: {
    subject: "Perioadă contestații APIA",
    body: "Aveți posibilitatea să depuneți contestații la APIA până pe {{validUntil}}.",
  },
};

const ALERT_TEMPLATE_FALLBACK = {
  subject: "Alertă importantă pentru ferma dvs.",
  body: "Vă informăm că există o alertă activă în {{county}}. Vă rugăm să verificați statusul.",
};

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface AlertCampaignJobData {
  tenantId: string;
  leadId: string;
  county: string;
  alertType: string;
  severity: "YELLOW" | "ORANGE" | "RED";
  source: "WEATHER" | "APIA";
  description?: string;
  validUntil?: string;
}

export interface AlertCampaignResult {
  ok: boolean;
  leadId: string;
  alertType: string;
  nurturingStateId?: string;
  actionInserted: boolean;
  outreachEnqueued: boolean;
}

// ---------------------------------------------------------------------------
// Helper: interpolează template cu variabile
// ---------------------------------------------------------------------------

function renderTemplate(template: string, vars: Record<string, string | undefined>): string {
  if (!template) return "";
  return template.replaceAll(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createAlertCampaignTriggerWorker(): Worker {
  const outreachQueue = createQueue(QUEUE_OUTREACH_ORCHESTRATOR_DISPATCH, { db: 5 });

  const { worker } = createWorker<AlertCampaignJobData>(
    QUEUE_ALERTS_CAMPAIGN_TRIGGER,
    async (job: Job<AlertCampaignJobData>): Promise<AlertCampaignResult> => {
      return withCognitiveSpan("e5:alert:campaign-trigger", async () => {
        const { tenantId, leadId, county, alertType, severity, source, description, validUntil } =
          job.data;

        // ── 1. SELECT goldNurturingState WHERE tenantId+leadId ───────────────
        const states = await db
          .select({
            id: goldNurturingState.id,
            currentState: goldNurturingState.currentState,
          })
          .from(goldNurturingState)
          .where(
            and(eq(goldNurturingState.tenantId, tenantId), eq(goldNurturingState.leadId, leadId)),
          )
          .limit(1);

        if (states.length === 0) {
          job.log(
            `[J55] WARN: nurturing state not found for tenantId=${tenantId} leadId=${leadId}`,
          );
          console.warn(`[J55] WARN: nurturing state not found leadId=${leadId}`);
          return {
            ok: false,
            leadId,
            alertType,
            actionInserted: false,
            outreachEnqueued: false,
          };
        }

        const state = states[0];

        // ── 2. Determină template ────────────────────────────────────────────
        const templateDef = ALERT_TEMPLATES[alertType] ?? ALERT_TEMPLATE_FALLBACK;

        const templateVars: Record<string, string | undefined> = {
          county,
          validUntil: validUntil ? new Date(validUntil).toLocaleDateString("ro-RO") : undefined,
        };

        const subject = renderTemplate(templateDef.subject, templateVars);
        const renderedBody = renderTemplate(templateDef.body, templateVars);

        // ── 3. INSERT goldNurturingActions ───────────────────────────────────
        let actionInserted = false;
        try {
          await db.insert(goldNurturingActions).values({
            tenantId,
            nurturingStateId: state.id,
            actionType: "WEATHER_ALERT",
            channel: "EMAIL",
            status: "PENDING",
            templateId: alertType,
            executedAt: new Date(),
          });
          actionInserted = true;
        } catch (err) {
          job.log(
            `[J55] WARN: Failed to insert nurturing action leadId=${leadId}: ${(err as Error).message}`,
          );
        }

        // ── 4. Enqueue outreach:orchestrator:dispatch ────────────────────────
        let outreachEnqueued = false;
        try {
          await outreachQueue.add(
            `alert-dispatch-${leadId}-${alertType}`,
            {
              tenantId,
              leadId,
              channel: "EMAIL",
              templateId: alertType,
              subject,
              body: renderedBody,
              source,
              severity,
              description,
            },
            {
              jobId: `alert-dispatch-${leadId}-${alertType}-${Date.now()}`,
              attempts: 3,
              backoff: { type: "exponential", delay: 5_000 },
            },
          );
          outreachEnqueued = true;
        } catch (err) {
          job.log(
            `[J55] WARN: Failed to enqueue outreach dispatch leadId=${leadId}: ${(err as Error).message}`,
          );
        }

        // ── 5. Log final ─────────────────────────────────────────────────────
        job.log(
          `[J55] Alert campaign triggered leadId=${leadId} alertType=${alertType} source=${source}`,
        );
        console.log(`[J55] Alert campaign triggered leadId=${leadId} alertType=${alertType}`);

        return {
          ok: true,
          leadId,
          alertType,
          nurturingStateId: state.id,
          actionInserted,
          outreachEnqueued,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 10,
    },
  );

  return worker;
}
