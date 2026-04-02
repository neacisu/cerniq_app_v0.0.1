/**
 * J57 — handover:context:load (concurrency:10)
 *
 * Construiește contextul complet pentru handover:
 *   1. Negociere: stare, valoare, assignment, score-uri
 *   2. Lead: date companie + contact principal (email, telefon, WhatsApp)
 *   3. Conversație: ultimele 20 mesaje AI
 *   4. Produse: coșul curent cu prețuri și discount
 *   5. Istoricul stărilor negocierii (ultimele 5 tranziții)
 *
 * Output: context complet → enqueue J58 channel:route:decide
 *
 * ANTI-HALUCINARE:
 *   - NU inventează date lipsă — folosește null/undefined explicit
 *   - Toate datele vin exclusiv din DB (RLS via setSessionTenantId)
 *   - assignedPhoneId din gold_negotiations.assigned_phone_id (plan L8409)
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  goldNegotiations,
  goldCompanies,
  goldContacts,
  negotiationItems,
  goldProducts,
  negotiationStateHistory,
  aiConversations,
  aiConversationMessages,
  eq,
  and,
  desc,
  sql,
} from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";

const LOG = "[j57-handover-context-load]";

// ── Queues ────────────────────────────────────────────────────────────────────

const channelRouteQueue = createQueue(QUEUES.E3_CHANNEL_ROUTE_DECIDE);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HandoverContextLoadJobData {
  tenantId: string;
  negotiationId: string;
  conversationId?: string;
  handoverReason: string;
  handoverTriggers: string[];
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface ContactInfo {
  email: string | null;
  telefon: string | null;
  whatsappNumber: string | null;
  numeComplet: string | null;
  preferredChannel: string | null;
}

export interface NegotiationContextItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  lineTotal: number;
}

export interface HandoverContext {
  tenantId: string;
  negotiationId: string;
  negotiationState: string;
  totalValue: number;
  aiConfidenceScore: number | null;
  maxDiscountOffered: number | null;
  assignedPhoneId: string | null;
  assignedUserId: string | null;
  leadId: string;
  leadName: string | null;
  leadCui: string | null;
  contact: ContactInfo;
  lastMessages: Array<{ role: string; content: string; createdAt: string }>;
  items: NegotiationContextItem[];
  stateHistory: Array<{ fromState: string | null; toState: string | null; createdAt: string }>;
  handoverReason: string;
  handoverTriggers: string[];
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  loadedAt: string;
}

export interface HandoverContextLoadResult {
  ok: true;
  context: HandoverContext;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const handoverContextLoadProcessor: Processor<
  HandoverContextLoadJobData,
  HandoverContextLoadResult
> = async (job) => {
  const { tenantId, negotiationId, conversationId, handoverReason, handoverTriggers, urgency } =
    job.data;

  await setSessionTenantId(tenantId);

  console.info(
    `${LOG} tenantId=${tenantId} negotiationId=${negotiationId} reason=${handoverReason}`,
  );

  // 1. Fetch negociere
  const [negotiation] = await db
    .select()
    .from(goldNegotiations)
    .where(and(eq(goldNegotiations.id, negotiationId), eq(goldNegotiations.tenantId, tenantId)))
    .limit(1);

  if (!negotiation) {
    throw new Error(`${LOG} negotiation not found: ${negotiationId}`);
  }

  // 2. Fetch companie lead
  const [company] = await db
    .select({
      id: goldCompanies.id,
      denumire: goldCompanies.denumire,
      cui: goldCompanies.cui,
    })
    .from(goldCompanies)
    .where(and(eq(goldCompanies.id, negotiation.leadId), eq(goldCompanies.tenantId, tenantId)))
    .limit(1);

  // 3. Fetch contact principal (primul contact cu email SAU whatsapp)
  const contacts = await db
    .select({
      email: goldContacts.email,
      telefon: goldContacts.telefon,
      whatsappNumber: goldContacts.whatsappNumber,
      numeComplet: sql<string>`${goldContacts.numeComplet}`,
      preferredChannel: goldContacts.preferredChannel,
    })
    .from(goldContacts)
    .where(and(eq(goldContacts.companyId, negotiation.leadId), eq(goldContacts.tenantId, tenantId)))
    .orderBy(goldContacts.createdAt)
    .limit(3);

  const primaryContact: ContactInfo = contacts[0]
    ? {
        email: contacts[0].email ?? null,
        telefon: contacts[0].telefon ?? null,
        whatsappNumber: contacts[0].whatsappNumber ?? null,
        numeComplet: contacts[0].numeComplet ?? null,
        preferredChannel: contacts[0].preferredChannel ?? null,
      }
    : {
        email: null,
        telefon: null,
        whatsappNumber: null,
        numeComplet: null,
        preferredChannel: null,
      };

  // 4. Fetch ultimele 20 mesaje AI din conversație
  let lastMessages: HandoverContext["lastMessages"] = [];
  if (conversationId) {
    const messages = await db
      .select({
        role: aiConversationMessages.role,
        content: aiConversationMessages.content,
        createdAt: aiConversationMessages.createdAt,
      })
      .from(aiConversationMessages)
      .where(
        and(
          eq(aiConversationMessages.conversationId, conversationId),
          eq(aiConversationMessages.tenantId, tenantId),
        ),
      )
      .orderBy(desc(aiConversationMessages.createdAt))
      .limit(20);

    lastMessages = messages.toReversed().map((m) => ({
      role: m.role,
      content: m.content ?? "",
      createdAt: m.createdAt?.toISOString() ?? new Date().toISOString(),
    }));
  } else {
    // Dacă nu avem conversationId, căutăm ultima conversație pe negociereId
    const [lastConv] = await db
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.negotiationId, negotiationId),
          eq(aiConversations.tenantId, tenantId),
        ),
      )
      .orderBy(desc(aiConversations.createdAt))
      .limit(1);

    if (lastConv) {
      const messages = await db
        .select({
          role: aiConversationMessages.role,
          content: aiConversationMessages.content,
          createdAt: aiConversationMessages.createdAt,
        })
        .from(aiConversationMessages)
        .where(
          and(
            eq(aiConversationMessages.conversationId, lastConv.id),
            eq(aiConversationMessages.tenantId, tenantId),
          ),
        )
        .orderBy(desc(aiConversationMessages.createdAt))
        .limit(20);

      lastMessages = messages.toReversed().map((m) => ({
        role: m.role,
        content: m.content ?? "",
        createdAt: m.createdAt?.toISOString() ?? new Date().toISOString(),
      }));
    }
  }

  // 5. Fetch items negociere cu produse
  const rawItems = await db
    .select({
      productId: negotiationItems.productId,
      productName: goldProducts.name,
      quantity: negotiationItems.quantity,
      unitPrice: negotiationItems.unitPrice,
      discountPct: negotiationItems.discountPct,
      lineTotal: negotiationItems.lineTotal,
    })
    .from(negotiationItems)
    .leftJoin(goldProducts, eq(negotiationItems.productId, goldProducts.id))
    .where(
      and(
        eq(negotiationItems.negotiationId, negotiationId),
        eq(negotiationItems.tenantId, tenantId),
      ),
    )
    .limit(200);

  const items: NegotiationContextItem[] = rawItems.map((r) => ({
    productId: r.productId,
    productName: r.productName ?? "Produs necunoscut",
    quantity: r.quantity ?? 0,
    unitPrice: Number.parseFloat(r.unitPrice ?? "0"),
    discountPct: Number.parseFloat(r.discountPct ?? "0"),
    lineTotal: Number.parseFloat(r.lineTotal ?? "0"),
  }));

  // 6. Fetch ultimele 5 tranziții de stare
  const stateHistoryRows = await db
    .select({
      fromState: negotiationStateHistory.fromState,
      toState: negotiationStateHistory.toState,
      createdAt: negotiationStateHistory.createdAt,
    })
    .from(negotiationStateHistory)
    .where(
      and(
        eq(negotiationStateHistory.negotiationId, negotiationId),
        eq(negotiationStateHistory.tenantId, tenantId),
      ),
    )
    .orderBy(desc(negotiationStateHistory.createdAt))
    .limit(5);

  const stateHistory = stateHistoryRows.map((r) => ({
    fromState: r.fromState ?? null,
    toState: r.toState ?? null,
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
  }));

  const context: HandoverContext = {
    tenantId,
    negotiationId,
    negotiationState: negotiation.currentState,
    totalValue: Number.parseFloat(String(negotiation.totalValue ?? "0")),
    aiConfidenceScore:
      negotiation.aiConfidenceScore !== null && negotiation.aiConfidenceScore !== undefined
        ? Number.parseFloat(String(negotiation.aiConfidenceScore))
        : null,
    maxDiscountOffered:
      negotiation.maxDiscountOffered !== null && negotiation.maxDiscountOffered !== undefined
        ? Number.parseFloat(String(negotiation.maxDiscountOffered))
        : null,
    assignedPhoneId: negotiation.assignedPhoneId ?? null,
    assignedUserId: negotiation.assignedUserId ?? null,
    leadId: negotiation.leadId,
    leadName: company?.denumire ?? null,
    leadCui: company?.cui ?? null,
    contact: primaryContact,
    lastMessages,
    items,
    stateHistory,
    handoverReason,
    handoverTriggers,
    urgency,
    loadedAt: new Date().toISOString(),
  };

  console.info(
    `${LOG} context built: messages=${lastMessages.length} items=${items.length} ` +
      `contact=${primaryContact.email ?? primaryContact.whatsappNumber ?? "none"}`,
  );

  await channelRouteQueue.add(
    `channel:route:${negotiationId}`,
    {
      tenantId,
      negotiationId,
      context,
    },
    DEFAULT_JOB_OPTIONS,
  );

  return { ok: true, context };
};
