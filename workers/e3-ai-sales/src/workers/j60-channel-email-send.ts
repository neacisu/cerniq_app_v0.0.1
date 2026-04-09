/**
 * J60 — channel:email:send (concurrency:10)
 *
 * Trimite email de handover personalizat per tenant + stage folosind Resend API.
 *
 * Template-uri disponibile:
 *   - HANDOVER_RO: template română (default pentru clienți RO)
 *   - HANDOVER_EN: template engleză (fallback)
 * Variabile dinamice injectate via Handlebars:
 *   contactName, leadName, negotiationState, agentName, handoverReason, supportEmail.
 *
 * ANTI-HALUCINARE:
 *   - RESEND_API_KEY + RESEND_FROM_EMAIL din env (OpenBao)
 *   - Validare email destinatar (regex RFC 5322 simplificat)
 *   - Resend error → throw (BullMQ retry)
 *   - NU trimite dacă email lipsă sau invalid
 */
import type { Processor } from "bullmq";
import Handlebars from "handlebars";
import { Resend } from "resend";
import { callExternalApi } from "@cerniq/worker-shared";
import { setSessionTenantId } from "@cerniq/db";
import type { HandoverContext } from "./j57-handover-context-load.js";

const LOG = "[j60-channel-email-send]";

/** Regex email simplificat (RFC 5322 subset). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Handlebars templates ──────────────────────────────────────────────────────

const HANDOVER_TEMPLATE_RO = `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><title>Preluare conversație</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2c3e50;">Bună ziua, {{contactName}}!</h2>

  <p>Vă contactăm în legătură cu discuția noastră despre produsele <strong>{{leadName}}</strong>.</p>

  <p>Un consultant dedicat va prelua conversația în cel mai scurt timp posibil pentru a vă oferi
  asistență personalizată și pentru a răspunde tuturor întrebărilor dumneavoastră.</p>

  {{#if agentName}}
  <p>Consultantul atribuit este: <strong>{{agentName}}</strong></p>
  {{/if}}

  <p>Stadiul actual al discuției: <strong>{{negotiationState}}</strong></p>

  <hr style="border: 1px solid #ecf0f1; margin: 20px 0;">

  <p style="color: #7f8c8d; font-size: 12px;">
    Dacă aveți întrebări urgente, ne puteți contacta la:
    <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
  </p>

  <p style="color: #7f8c8d; font-size: 12px;">
    Mulțumim pentru încredere! 🙏
  </p>
</body>
</html>`;

const HANDOVER_TEMPLATE_EN = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Conversation Handover</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2c3e50;">Hello, {{contactName}}!</h2>

  <p>We are reaching out regarding our conversation about <strong>{{leadName}}</strong> products.</p>

  <p>A dedicated consultant will take over the conversation as soon as possible to provide
  personalized assistance and answer all your questions.</p>

  {{#if agentName}}
  <p>Your assigned consultant: <strong>{{agentName}}</strong></p>
  {{/if}}

  <p>Current negotiation stage: <strong>{{negotiationState}}</strong></p>

  <hr style="border: 1px solid #ecf0f1; margin: 20px 0;">

  <p style="color: #7f8c8d; font-size: 12px;">
    For urgent inquiries, contact us at:
    <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
  </p>

  <p style="color: #7f8c8d; font-size: 12px;">Thank you for your trust! 🙏</p>
</body>
</html>`;

/** Detectează dacă e-mailul ar trebui în română vs engleză — în prezent RO implicit (extins în FAZA 13). */
function detectLanguage(_context: HandoverContext): "ro" | "en" {
  return "ro";
}

function selectTemplate(lang: "ro" | "en"): string {
  return lang === "en" ? HANDOVER_TEMPLATE_EN : HANDOVER_TEMPLATE_RO;
}

function buildSubject(lang: "ro" | "en", context: HandoverContext): string {
  const stageName = context.negotiationState.replaceAll("_", " ").toLowerCase();
  if (lang === "en") {
    return `Your conversation has been assigned to a consultant — ${context.leadName ?? ""}`.trim();
  }
  return `Conversația dvs. a fost preluată de un consultant (${stageName})`.trim();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChannelEmailSendJobData {
  tenantId: string;
  negotiationId: string;
  recipientEmail: string;
  /** Context complet din J57 (pentru template variables + audit). */
  context: HandoverContext;
  /** Starea negocierii (pentru template + subject). */
  stage: string;
}

export interface ChannelEmailSendResult {
  ok: true;
  sent: boolean;
  messageId?: string;
  reason?: string;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const channelEmailSendProcessor: Processor<
  ChannelEmailSendJobData,
  ChannelEmailSendResult
> = async (job) => {
  const { tenantId, negotiationId, recipientEmail, context } = job.data;

  await setSessionTenantId(tenantId);

  console.info(
    `${LOG} tenantId=${tenantId} negotiationId=${negotiationId} ` +
      `recipient=${recipientEmail.split("@")[0]}@***`,
  );

  // 1. Validare email destinatar
  if (!EMAIL_REGEX.test(recipientEmail)) {
    console.warn(
      `${LOG} invalid email: ${recipientEmail.split("@")[0]}@*** negotiation=${negotiationId}`,
    );
    return { ok: true, sent: false, reason: "invalid_email" };
  }

  // 2. Resend client (RESEND_API_KEY din OpenBao)
  const apiKey = process.env["RESEND_API_KEY"] ?? "";
  const fromEmail = process.env["RESEND_FROM_EMAIL"] ?? "noreply@cerniq.com";

  if (!apiKey) {
    throw new Error(`${LOG} RESEND_API_KEY not configured`);
  }

  const resend = new Resend(apiKey);

  // 3. Compilare template Handlebars
  const lang = detectLanguage(context);
  const rawTemplate = selectTemplate(lang);
  const compiledTemplate = Handlebars.compile(rawTemplate);

  const templateVars = {
    contactName: context.contact.numeComplet ?? context.leadName ?? "Client",
    leadName: context.leadName ?? "",
    negotiationState: context.negotiationState.replaceAll("_", " "),
    agentName: null as string | null,
    supportEmail: fromEmail,
  };

  const htmlBody = compiledTemplate(templateVars);
  const subject = buildSubject(lang, context);

  // 4. Trimite via Resend API (rate limit + circuit breaker + metrici, ca în `packages/integrations`)
  const result = await callExternalApi("resend", () =>
    resend.emails.send({
      from: fromEmail,
      to: [recipientEmail],
      subject,
      html: htmlBody,
      tags: [
        { name: "type", value: "handover_notification" },
        { name: "tenant_id", value: tenantId },
        { name: "negotiation_id", value: negotiationId },
        { name: "stage", value: context.negotiationState },
      ],
    }),
  );

  if (result.error) {
    throw new Error(`${LOG} Resend error: ${result.error.message ?? JSON.stringify(result.error)}`);
  }

  const messageId = result.data?.id ?? "";

  console.info(
    `${LOG} email sent: messageId=${messageId} negotiation=${negotiationId} lang=${lang}`,
  );

  return { ok: true, sent: true, messageId };
};
