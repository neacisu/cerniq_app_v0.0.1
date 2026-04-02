/**
 * J58 — channel:route:decide (concurrency:10)
 *
 * Decide canalul de comunicare pentru handover:
 *   1. WA (preferat) — dacă există whatsappNumber + nu e noapte (21:00-08:00 RO)
 *   2. Email (fallback) — dacă există email
 *   3. Phone (urgente/high-value) — urgency=CRITICAL sau totalValue > HIGH_VALUE_THRESHOLD
 *
 * Time-zone: Romania UTC+2 (iarnă) / UTC+3 (vară) — via Intl.DateTimeFormat('Europe/Bucharest').
 * Respectă preferința clientului din goldContacts.preferredChannel.
 *
 * ANTI-HALUCINARE:
 *   - WA INTERZIS între 21:00-08:00 ora României (plan L325)
 *   - Verificare strictă: contact.whatsappNumber E.164 format
 *   - Dacă nu există nici email, nici WA → escaladare HITL via N76
 */
import type { Processor } from "bullmq";
import { setSessionTenantId } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";
import type { HandoverContext } from "./j57-handover-context-load.js";

const LOG = "[j58-channel-route-decide]";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Prag valoare mare (RON) — activează PHONE ca canal preferat pentru urgențe.
 * Plan L8409: negotiation totalValue pentru escaladare director.
 */
const HIGH_VALUE_THRESHOLD_RON = 50_000;

/** Regexul E.164 pentru validare număr de telefon WA. */
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

// ── Timezone helper ───────────────────────────────────────────────────────────

/**
 * Returnează ora curentă în România (Europe/Bucharest, UTC+2/+3 DST).
 * Folosit pentru WA blackout 21:00-08:00.
 */
export function getCurrentHourInRomania(now: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest",
    hour: "numeric",
    hour12: false,
  });
  const formatted = fmt.format(now);
  const hour = Number.parseInt(formatted, 10);
  return Number.isNaN(hour) ? now.getUTCHours() : hour;
}

/**
 * Returnează true dacă ora curentă (România) este în blackout WA (21:00-08:00).
 * La ora 0 (midnight), `hour12: false` poate returna "24" în unele implementări → normalizat la 0.
 */
export function isWaBlackoutTime(now: Date = new Date()): boolean {
  let hour = getCurrentHourInRomania(now);
  if (hour === 24) hour = 0;
  return hour >= 21 || hour < 8;
}

// ── Queues ────────────────────────────────────────────────────────────────────

const whatsappSendQueue = createQueue(QUEUES.E3_CHANNEL_WHATSAPP_SEND);
const emailSendQueue = createQueue(QUEUES.E3_CHANNEL_EMAIL_SEND);
const hitlQueue = createQueue(QUEUES.HITL_ESCALATION);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChannelRouteDecideJobData {
  tenantId: string;
  negotiationId: string;
  context: HandoverContext;
}

export type RoutedChannel = "WA" | "EMAIL" | "PHONE" | "HITL";

export interface ChannelRouteDecideResult {
  ok: true;
  channel: RoutedChannel;
  reason: string;
  scheduledAt: string;
  blackoutApplied: boolean;
}

// ── Channel resolution (extracted for reduced cognitive complexity) ───────────

interface ResolveChannelParams {
  hasWa: boolean;
  hasEmail: boolean;
  isHighValue: boolean;
  isCritical: boolean;
  blackout: boolean;
  clientPrefersEmail: boolean;
  clientPrefersWa: boolean;
  totalValue: number;
}

interface ChannelDecision {
  channel: RoutedChannel;
  reason: string;
  blackoutApplied: boolean;
}

function resolveWaBlackoutFallback(hasEmail: boolean): ChannelDecision {
  if (hasEmail) {
    return { channel: "EMAIL", reason: "wa_blackout_email_fallback", blackoutApplied: true };
  }
  return { channel: "PHONE", reason: "wa_blackout_no_email_phone", blackoutApplied: true };
}

/**
 * Determinist channel routing logic — prioritate:
 * 1. CRITICAL + high-value → PHONE
 * 2. Preferința clientului (dacă setată)
 * 3. WA preferat (dacă nu e noapte + există număr)
 * 4. Email fallback
 * 5. HITL escalation (nicio informație de contact)
 */
function resolveChannel(params: ResolveChannelParams): ChannelDecision {
  const {
    hasWa,
    hasEmail,
    isHighValue,
    isCritical,
    blackout,
    clientPrefersEmail,
    clientPrefersWa,
    totalValue,
  } = params;

  if (isCritical && isHighValue) {
    return {
      channel: "PHONE",
      reason: `critical_urgency_high_value_${totalValue.toFixed(0)}RON`,
      blackoutApplied: false,
    };
  }
  if (clientPrefersEmail && hasEmail) {
    return { channel: "EMAIL", reason: "client_preference_email", blackoutApplied: false };
  }
  if (clientPrefersWa && hasWa) {
    if (blackout && hasEmail) {
      return {
        channel: "EMAIL",
        reason: "client_prefers_wa_but_blackout_email_fallback",
        blackoutApplied: true,
      };
    }
    if (blackout) {
      return {
        channel: "PHONE",
        reason: "client_prefers_wa_but_blackout_no_email_phone",
        blackoutApplied: true,
      };
    }
    return { channel: "WA", reason: "client_preference_wa", blackoutApplied: false };
  }
  if (hasWa && !blackout) {
    return { channel: "WA", reason: "wa_preferred_available", blackoutApplied: false };
  }
  if (hasWa) {
    return resolveWaBlackoutFallback(hasEmail);
  }
  if (hasEmail) {
    return { channel: "EMAIL", reason: "email_fallback_no_wa", blackoutApplied: false };
  }
  return { channel: "HITL", reason: "no_contact_info_hitl_escalation", blackoutApplied: false };
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const channelRouteDecideProcessor: Processor<
  ChannelRouteDecideJobData,
  ChannelRouteDecideResult
> = async (job) => {
  const { tenantId, negotiationId, context } = job.data;

  await setSessionTenantId(tenantId);

  const now = new Date();
  const blackout = isWaBlackoutTime(now);

  console.info(
    `${LOG} tenantId=${tenantId} negotiationId=${negotiationId} ` +
      `urgency=${context.urgency} totalValue=${context.totalValue} blackout=${blackout}`,
  );

  const hasWa = !!context.contact.whatsappNumber && E164_REGEX.test(context.contact.whatsappNumber);
  const hasEmail = !!context.contact.email;
  const isHighValue = context.totalValue >= HIGH_VALUE_THRESHOLD_RON;
  const isCritical = context.urgency === "CRITICAL";
  const clientPrefersEmail = context.contact.preferredChannel === "EMAIL";
  const clientPrefersWa =
    context.contact.preferredChannel === "WA" || context.contact.preferredChannel === "WHATSAPP";

  const { channel, reason, blackoutApplied } = resolveChannel({
    hasWa,
    hasEmail,
    isHighValue,
    isCritical,
    blackout,
    clientPrefersEmail,
    clientPrefersWa,
    totalValue: context.totalValue,
  });

  console.info(`${LOG} decision: channel=${channel} reason=${reason} blackout=${blackoutApplied}`);

  const scheduledAt = now.toISOString();

  switch (channel) {
    case "WA":
      await whatsappSendQueue.add(
        `channel:wa:${negotiationId}`,
        {
          tenantId,
          negotiationId,
          recipientPhone: context.contact.whatsappNumber ?? "",
          phoneId: context.assignedPhoneId,
          message: buildHandoverWaMessage(context),
          context,
        },
        DEFAULT_JOB_OPTIONS,
      );
      break;

    case "EMAIL":
      await emailSendQueue.add(
        `channel:email:${negotiationId}`,
        {
          tenantId,
          negotiationId,
          recipientEmail: context.contact.email ?? "",
          context,
          stage: context.negotiationState,
        },
        DEFAULT_JOB_OPTIONS,
      );
      break;

    case "PHONE":
      // Phone routing: log + HITL cu metadata telefon
      console.warn(
        `${LOG} PHONE channel: manual call required for negotiation=${negotiationId} ` +
          `telefon=${context.contact.telefon ?? "N/A"}`,
      );
      await hitlQueue.add(
        `hitl:phone:${negotiationId}`,
        {
          tenantId,
          negotiationId,
          reason: `phone_handover_${reason}`,
          urgency: context.urgency,
          contactPhone: context.contact.telefon,
          context,
        },
        { ...DEFAULT_JOB_OPTIONS, priority: isCritical ? 1 : 5 },
      );
      break;

    case "HITL":
      await hitlQueue.add(
        `hitl:nocontact:${negotiationId}`,
        {
          tenantId,
          negotiationId,
          reason: "no_contact_info",
          urgency: context.urgency,
          context,
        },
        { ...DEFAULT_JOB_OPTIONS, priority: 1 },
      );
      break;
  }

  return { ok: true, channel, reason, scheduledAt, blackoutApplied };
};

// ── Template helpers ──────────────────────────────────────────────────────────

function buildHandoverWaMessage(context: HandoverContext): string {
  const name = context.contact.numeComplet ?? context.leadName ?? "Client";
  return (
    `Bună ziua, ${name}! 👋\n\n` +
    `Un consultant dedicat va prelua conversația noastră în cel mai scurt timp posibil.\n\n` +
    `Mulțumim pentru răbdare! 🙏`
  );
}
