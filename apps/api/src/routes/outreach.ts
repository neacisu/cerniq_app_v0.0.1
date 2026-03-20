/**
 * Etapa 2 — Outreach API Routes
 * Sources: etapa2-api-endpoints.md, etapa2-hitl-system.md
 * Prefix registered at: /api/v1/outreach
 */
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z, iso } from "zod";
import {
  db,
  sql,
  eq,
  and,
  desc,
  asc,
  inArray,
  or,
  isNotNull,
  gte,
  lte,
  leadJourney,
  communicationLog,
  waPhoneNumbers,
  waQuotaUsage,
  outreachSequences,
  outreachSequenceSteps,
  sequenceEnrollments,
  outreachTemplates,
  humanReviewQueue,
  outreachDailyStats,
  outreachSettings,
  outreachNotifications,
  goldCompanies,
  goldContacts,
  silverCompanies,
  silverContacts,
  type SQL,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import {
  getWaPhoneFollowupQueueName,
  getWaPhoneQueueName,
  WA_PHONE_COUNT,
} from "@cerniq/worker-shared";
import { requireTenantId, getActorId } from "./utils.js";
import type { Campaign } from "@cerniq/integrations/instantly";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const LEAD_STATES = [
  "COLD",
  "CONTACTED_WA",
  "CONTACTED_EMAIL",
  "WARM_REPLY",
  "NEGOTIATION",
  "CONVERTED",
  "DEAD",
  "PAUSED",
] as const;

const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  COLD: ["CONTACTED_WA", "CONTACTED_EMAIL", "DEAD"],
  CONTACTED_WA: ["WARM_REPLY", "CONTACTED_EMAIL", "DEAD"],
  CONTACTED_EMAIL: ["WARM_REPLY", "CONTACTED_WA", "DEAD"],
  WARM_REPLY: ["NEGOTIATION", "DEAD", "PAUSED"],
  NEGOTIATION: ["CONVERTED", "DEAD", "PAUSED", "WARM_REPLY"],
  CONVERTED: [],
  DEAD: ["COLD"],
  PAUSED: ["COLD", "WARM_REPLY", "NEGOTIATION"],
};

const WARM_STATES = ["WARM_REPLY", "NEGOTIATION"] as const;

/** Evită injectarea de metacaractere în `RegExp` la substituirea variabilelor `{{key}}`. */
function escapeRegExpMeta(s: string): string {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * API-ul public folosește uneori agregatul „EMAIL”; în PG enum-ul canonic este EMAIL_COLD / EMAIL_WARM.
 * Pentru `primary_channel` la secvențe, „EMAIL” înseamnă canal rece (outreach inițial).
 */
function mapApiEmailAggregateToChannel(
  c: "WHATSAPP" | "EMAIL",
): "WHATSAPP" | "EMAIL_COLD" | "EMAIL_WARM" {
  return c === "WHATSAPP" ? "WHATSAPP" : "EMAIL_COLD";
}

/** Mapare filtre UI vechi → valori `template_type_enum` (schema outreach). */
const TEMPLATE_TYPE_QUERY_MAP = {
  INITIAL_CONTACT: "INITIAL" as const,
  FOLLOW_UP: "FOLLOWUP" as const,
  WARM_REPLY: "RESPONSE" as const,
  CLOSING: "CLOSING" as const,
};

type TemplateTypeQuery = keyof typeof TEMPLATE_TYPE_QUERY_MAP;

/** Chei identice cu `TEMPLATE_TYPE_QUERY_MAP` — folosit la `z.enum` pentru narrowing fără `as`. */
const TEMPLATE_TYPE_FILTER_KEYS = [
  "INITIAL_CONTACT",
  "FOLLOW_UP",
  "WARM_REPLY",
  "CLOSING",
] as const satisfies readonly TemplateTypeQuery[];

const templateTypeFilterSchema = z.enum(TEMPLATE_TYPE_FILTER_KEYS);

const idParamSchema = z.object({ id: z.uuid() });

const leadsQuerySchema = z.object({
  /** Filtru după `gold_companies.id` (coloana `lead_journey.lead_id`). */
  goldCompanyId: z.uuid().optional(),
  state: z.enum(LEAD_STATES).optional(),
  channel: z.enum(["WHATSAPP", "EMAIL_COLD", "EMAIL_WARM", "PHONE", "MANUAL"]).optional(),
  assignedTo: z.uuid().optional(),
  assignedPhone: z.uuid().optional(),
  hasReply: z.coerce.boolean().optional(),
  needsReview: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
  minSentiment: z.coerce.number().min(-100).max(100).optional(),
  maxSentiment: z.coerce.number().min(-100).max(100).optional(),
  createdAfter: iso.datetime().optional(),
  createdBefore: iso.datetime().optional(),
  sortBy: z
    .enum(["nextActionAt", "lastContactAt", "sentimentScore", "createdAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type LeadsSortBy = z.infer<typeof leadsQuerySchema>["sortBy"];

/** Aceleași filtre ca GET /leads, fără paginare (export CSV). */
const leadsExportQuerySchema = leadsQuerySchema.omit({ page: true, limit: true });

function csvEscape(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return csvEscape(value.toISOString());
  const v = String(value);
  if (/[",\n\r]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
  return v;
}

function resolveLeadSortColumn(sortBy: LeadsSortBy) {
  if (sortBy === "sentimentScore") {
    return leadJourney.sentimentScore;
  }
  if (sortBy === "nextActionAt") {
    return leadJourney.nextActionAt;
  }
  if (sortBy === "lastContactAt") {
    return leadJourney.lastContactAt;
  }
  return leadJourney.createdAt;
}

const patchLeadSchema = z.object({
  currentState: z.enum(LEAD_STATES).optional(),
  assignedToUser: z.uuid().nullable().optional(),
  isHumanControlled: z.boolean().optional(),
});

const sendMessageSchema = z.object({
  channel: z.enum(["WHATSAPP", "EMAIL_WARM"]),
  content: z.string().min(1).max(4000),
  subject: z.string().max(500).optional(),
  templateId: z.uuid().optional(),
  scheduledAt: iso.datetime().optional(),
});

const sequenceStepBodySchema = z.object({
  delayHours: z.number().int().min(0).max(720),
  delayMinutes: z.number().int().min(0).max(59).default(0),
  channel: z.enum(["WHATSAPP", "EMAIL_COLD", "EMAIL_WARM"]),
  templateId: z.uuid().optional(),
});

const createSequenceSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  primaryChannel: z.enum(["WHATSAPP", "EMAIL"]),
  respectBusinessHours: z.boolean().default(true),
  stopOnReply: z.boolean().default(true),
  steps: z.array(sequenceStepBodySchema).min(1).max(10),
});

const patchSequenceSchema = z
  .object({
    name: z.string().min(3).max(200).optional(),
    description: z.string().max(1000).optional(),
    isActive: z.boolean().optional(),
    stopOnReply: z.boolean().optional(),
    respectBusinessHours: z.boolean().optional(),
    steps: z.array(sequenceStepBodySchema).min(1).max(10).optional(),
  })
  .refine(
    (b) =>
      b.name !== undefined ||
      b.description !== undefined ||
      b.isActive !== undefined ||
      b.stopOnReply !== undefined ||
      b.respectBusinessHours !== undefined ||
      b.steps !== undefined,
    { message: "At least one field is required" },
  );

const enrollSchema = z.object({
  leadIds: z.array(z.uuid()).min(1).max(500),
  startStep: z.number().int().min(0).optional(),
  scheduledStart: iso.datetime().optional(),
});

const createOutreachLeadsSchema = z.object({
  goldCompanyIds: z.array(z.uuid()).min(1).max(500),
});

/** Import CSV: creează silver → gold → gold_contacts → lead_journey (companie nouă per rând). */
const importOutreachLeadRowSchema = z.object({
  denumire: z.string().min(1).max(255),
  cui: z.string().min(2).max(32).optional(),
  judet: z.string().max(50).optional(),
  /** Zod 4: `z.string().email()` este deprecat — folosim `z.email()`. */
  email: z.union([z.email(), z.literal("")]).optional(),
  telefon: z.string().max(32).optional(),
});

const importOutreachLeadsSchema = z.object({
  rows: z.array(importOutreachLeadRowSchema).min(1).max(500),
});

const createTemplateSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  channel: z.enum(["WHATSAPP", "EMAIL"]),
  subject: z.string().max(500).optional(),
  bodyTemplate: z.string().min(10).max(4000),
  templateType: z.enum(["INITIAL", "FOLLOWUP", "RESPONSE", "CLOSING"]),
  variables: z.array(z.string()).default([]),
  hasMedia: z.boolean().default(false),
  mediaType: z.string().max(50).optional(),
  mediaUrl: z.url().optional(),
});

const reviewQuerySchema = z.object({
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  status: z
    .enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "ESCALATED", "EXPIRED"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const resolveReviewSchema = z.object({
  action: z.enum(["APPROVED", "EDITED", "REJECTED", "TAKEOVER", "IGNORED"]),
  editedContent: z.string().max(4000).optional(),
  notes: z.string().max(1000).optional(),
});

/** Prioritate contact principal pentru outreach (plan R0.002). */
const CONTACT_ROLE_PRIORITY: Record<string, number> = {
  ADMINISTRATOR: 1,
  REPREZENTANT: 2,
  ACTIONAR: 3,
  CONTACT: 4,
  ASOCIAT: 5,
};

function pickPrimaryGoldContact(contacts: (typeof goldContacts.$inferSelect)[]) {
  if (contacts.length === 0) return null;
  return [...contacts].sort(
    (a, b) =>
      (CONTACT_ROLE_PRIORITY[String(a.role ?? "CONTACT")] ?? 99) -
      (CONTACT_ROLE_PRIORITY[String(b.role ?? "CONTACT")] ?? 99),
  )[0];
}

function mapOutreachCompanyPayload(
  gold: typeof goldCompanies.$inferSelect | null | undefined,
  contact: typeof goldContacts.$inferSelect | null,
) {
  if (!gold) return null;
  const contactName =
    contact?.numeComplet?.trim() ||
    [contact?.prenume, contact?.nume].filter(Boolean).join(" ").trim() ||
    null;
  return {
    id: gold.id,
    name: gold.denumire ?? "",
    denumire: gold.denumire,
    cui: gold.cui,
    judet: gold.judet,
    localitate: gold.localitate,
    email: contact?.email ?? null,
    telefon: contact?.telefon ?? null,
    whatsappNumber: contact?.whatsappNumber ?? null,
    contactName,
    website: null as string | null,
  };
}

type LeadsQueryParsed = z.infer<typeof leadsQuerySchema>;
/** Filtre comune GET /leads și export (fără paginare). */
type LeadJourneyFiltersInput = Omit<LeadsQueryParsed, "page" | "limit">;

/** Condiții SQL reutilizate la GET /leads și export CSV (aceeași logică de filtrare). */
function buildLeadJourneyListConditions(tenantId: string, query: LeadJourneyFiltersInput): SQL[] {
  const conditions: SQL[] = [eq(leadJourney.tenantId, tenantId)];
  if (query.goldCompanyId) conditions.push(eq(leadJourney.leadId, query.goldCompanyId));
  if (query.state) conditions.push(eq(leadJourney.currentState, query.state));
  if (query.assignedPhone) conditions.push(eq(leadJourney.assignedPhoneId, query.assignedPhone));
  if (query.needsReview !== undefined)
    conditions.push(eq(leadJourney.requiresHumanReview, query.needsReview));
  if (query.minSentiment !== undefined)
    conditions.push(sql`${leadJourney.sentimentScore} >= ${query.minSentiment}`);
  if (query.maxSentiment !== undefined)
    conditions.push(sql`${leadJourney.sentimentScore} <= ${query.maxSentiment}`);
  if (query.createdAfter)
    conditions.push(sql`${leadJourney.createdAt} >= ${query.createdAfter}::timestamptz`);
  if (query.createdBefore)
    conditions.push(sql`${leadJourney.createdAt} <= ${query.createdBefore}::timestamptz`);
  if (query.channel) conditions.push(eq(leadJourney.lastChannelUsed, query.channel));
  if (query.assignedTo) conditions.push(eq(leadJourney.assignedToUser, query.assignedTo));
  if (query.hasReply === true) conditions.push(sql`${leadJourney.replyCount} > 0`);
  if (query.hasReply === false)
    conditions.push(sql`(${leadJourney.replyCount} = 0 OR ${leadJourney.replyCount} IS NULL)`);
  if (query.search?.trim()) {
    const pattern = `%${query.search.trim()}%`;
    const searchCond = or(
      sql`${goldCompanies.denumire} ILIKE ${pattern}`,
      sql`${goldCompanies.cui} ILIKE ${pattern}`,
    );
    if (searchCond) conditions.push(searchCond);
  }
  return conditions;
}

/** Verifică dacă există cel puțin un canal de contact (gold_contacts sau silver_contacts). */
async function companyHasReachableContact(
  tenantId: string,
  goldCompanyId: string,
  silverCompanyId: string | null,
): Promise<boolean> {
  const [gc] = await db
    .select({ id: goldContacts.id })
    .from(goldContacts)
    .where(
      and(
        eq(goldContacts.tenantId, tenantId),
        eq(goldContacts.companyId, goldCompanyId),
        or(
          sql`TRIM(COALESCE(${goldContacts.email}, '')) <> ''`,
          sql`TRIM(COALESCE(${goldContacts.telefon}, '')) <> ''`,
          sql`TRIM(COALESCE(${goldContacts.whatsappNumber}, '')) <> ''`,
        ),
      ),
    )
    .limit(1);
  if (gc) return true;
  if (!silverCompanyId) return false;
  const [sc] = await db
    .select({ id: silverContacts.id })
    .from(silverContacts)
    .where(
      and(
        eq(silverContacts.tenantId, tenantId),
        eq(silverContacts.companyId, silverCompanyId),
        or(
          sql`TRIM(COALESCE(${silverContacts.email}, '')) <> ''`,
          sql`TRIM(COALESCE(${silverContacts.telefon}, '')) <> ''`,
          sql`TRIM(COALESCE(${silverContacts.telefonE164}, '')) <> ''`,
          sql`TRIM(COALESCE(${silverContacts.whatsappNumber}, '')) <> ''`,
        ),
      ),
    )
    .limit(1);
  return Boolean(sc);
}

async function loadPrimaryContactsForGoldCompanies(
  tenantId: string,
  companyIds: string[],
): Promise<Map<string, typeof goldContacts.$inferSelect>> {
  const map = new Map<string, typeof goldContacts.$inferSelect>();
  if (companyIds.length === 0) return map;
  const rows = await db
    .select()
    .from(goldContacts)
    .where(and(eq(goldContacts.tenantId, tenantId), inArray(goldContacts.companyId, companyIds)));
  const byCompany = new Map<string, (typeof goldContacts.$inferSelect)[]>();
  for (const r of rows) {
    const list = byCompany.get(r.companyId) ?? [];
    list.push(r);
    byCompany.set(r.companyId, list);
  }
  for (const [cid, list] of byCompany) {
    const c = pickPrimaryGoldContact(list);
    if (c) map.set(cid, c);
  }
  return map;
}

async function loadOutreachMetrics(tenantId: string, period: "7d" | "30d" | "90d" | "custom") {
  const ANALYTICS_PERIOD_DAYS: Record<typeof period, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    custom: 90,
  };
  const days = ANALYTICS_PERIOD_DAYS[period];
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const funnel = await db
    .select({
      state: leadJourney.currentState,
      count: sql<number>`count(*)::int`,
    })
    .from(leadJourney)
    .where(eq(leadJourney.tenantId, tenantId))
    .groupBy(leadJourney.currentState);

  const sentimentStats = await db
    .select({
      negative: sql<number>`count(*) filter (where ${leadJourney.sentimentScore} < 0)::int`,
      neutral: sql<number>`count(*) filter (where ${leadJourney.sentimentScore} >= 0 and ${leadJourney.sentimentScore} < 50)::int`,
      positive: sql<number>`count(*) filter (where ${leadJourney.sentimentScore} >= 50)::int`,
    })
    .from(leadJourney)
    .where(eq(leadJourney.tenantId, tenantId));

  const channelStats = await db
    .select({
      channel: communicationLog.channel,
      direction: communicationLog.direction,
      status: communicationLog.status,
      count: sql<number>`count(*)::int`,
    })
    .from(communicationLog)
    .where(
      and(
        eq(communicationLog.tenantId, tenantId),
        sql`${communicationLog.createdAt} >= ${from}::timestamptz`,
      ),
    )
    .groupBy(communicationLog.channel, communicationLog.direction, communicationLog.status);

  const [pendingReviews] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(humanReviewQueue)
    .where(and(eq(humanReviewQueue.tenantId, tenantId), eq(humanReviewQueue.status, "PENDING")));

  const [activeSeqs] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(outreachSequences)
    .where(and(eq(outreachSequences.tenantId, tenantId), eq(outreachSequences.isActive, true)));

  const phones = await db
    .select()
    .from(waPhoneNumbers)
    .where(eq(waPhoneNumbers.tenantId, tenantId));

  return {
    funnel,
    sentimentStats,
    channelStats,
    pendingReviews,
    activeSeqs,
    phones,
    from,
  };
}

function computeScheduledDelayMs(scheduledAtIso: string | undefined): number {
  if (!scheduledAtIso) return 0;
  const t = Date.parse(scheduledAtIso);
  return Number.isNaN(t) ? 0 : Math.max(0, t - Date.now());
}

type SendLeadRow = Pick<
  typeof leadJourney.$inferSelect,
  | "currentState"
  | "assignedPhoneId"
  | "isNewContact"
  | "lastChannelUsed"
  | "firstContactChannel"
  | "firstContactAt"
>;

async function resolveOutboundQueueForSendMessage(
  tenantId: string,
  body: { channel: "WHATSAPP" | "EMAIL_WARM"; subject?: string },
  lead: SendLeadRow,
): Promise<
  | { ok: true; queueName: string }
  | { ok: false; status: number; body: { success: false; error: string } }
> {
  if (body.channel === "EMAIL_WARM") {
    if (!WARM_STATES.includes(lead.currentState as "WARM_REPLY" | "NEGOTIATION")) {
      return {
        ok: false,
        status: 400,
        body: {
          success: false,
          error: `EMAIL_WARM requires lead state WARM_REPLY or NEGOTIATION (ADR-0059). Current: ${lead.currentState}`,
        },
      };
    }
    return { ok: true, queueName: "q:email:warm" };
  }
  const phoneId = lead.assignedPhoneId;
  if (!phoneId) {
    return {
      ok: false,
      status: 400,
      body: { success: false, error: "Lead has no assigned phone" },
    };
  }
  const [phoneRow] = await db
    .select({ priority: waPhoneNumbers.priority })
    .from(waPhoneNumbers)
    .where(and(eq(waPhoneNumbers.id, phoneId), eq(waPhoneNumbers.tenantId, tenantId)))
    .limit(1);
  if (!phoneRow) {
    return {
      ok: false,
      status: 400,
      body: { success: false, error: "Assigned phone not found for tenant" },
    };
  }
  const phoneIndex = Math.min(Math.max(phoneRow.priority, 1), WA_PHONE_COUNT);
  const isWaFollowUp =
    lead.lastChannelUsed === "WHATSAPP" ||
    (lead.firstContactChannel === "WHATSAPP" && lead.firstContactAt != null && !lead.isNewContact);
  const queueName = isWaFollowUp
    ? getWaPhoneFollowupQueueName(phoneIndex)
    : getWaPhoneQueueName(phoneIndex);
  return { ok: true, queueName };
}

async function buildOutreachDashboardResponse(
  tenantId: string,
  period: "7d" | "30d" | "90d" | "custom",
) {
  const { funnel, sentimentStats, channelStats, pendingReviews, activeSeqs, phones, from } =
    await loadOutreachMetrics(tenantId, period);

  const sentimentRow = sentimentStats[0] ?? { negative: 0, neutral: 0, positive: 0 };
  const sentimentDistribution = [
    { category: "negative", count: sentimentRow.negative },
    { category: "neutral", count: sentimentRow.neutral },
    { category: "positive", count: sentimentRow.positive },
  ];

  const leadFunnel = funnel.map((f) => ({
    state: f.state,
    count: f.count,
  }));

  const totalNonDead = funnel.filter((f) => f.state !== "DEAD").reduce((a, f) => a + f.count, 0);
  const convertedCount = funnel.find((f) => f.state === "CONVERTED")?.count ?? 0;
  const conversionRate =
    totalNonDead > 0 ? Math.round((convertedCount / totalNonDead) * 1000) / 10 : 0;

  const channelPerformanceMap = new Map<
    string,
    { sent: number; delivered: number; replied: number; bounced: number }
  >();
  for (const row of channelStats) {
    const ch = String(row.channel ?? "UNKNOWN");
    const cur = channelPerformanceMap.get(ch) ?? {
      sent: 0,
      delivered: 0,
      replied: 0,
      bounced: 0,
    };
    if (row.direction === "OUTBOUND") cur.sent += row.count;
    if (row.direction === "INBOUND") cur.replied += row.count;
    const st = String(row.status ?? "");
    if (st === "DELIVERED" || st === "READ") cur.delivered += row.count;
    if (st === "BOUNCED" || st === "FAILED") cur.bounced += row.count;
    channelPerformanceMap.set(ch, cur);
  }
  const channelPerformance = [...channelPerformanceMap.entries()].map(([channel, v]) => ({
    channel,
    ...v,
  }));

  const recentLogRows = await db
    .select({
      id: communicationLog.id,
      leadJourneyId: communicationLog.leadJourneyId,
      channel: communicationLog.channel,
      direction: communicationLog.direction,
      createdAt: communicationLog.createdAt,
      denumire: goldCompanies.denumire,
    })
    .from(communicationLog)
    .innerJoin(
      leadJourney,
      and(
        eq(communicationLog.leadJourneyId, leadJourney.id),
        eq(communicationLog.tenantId, tenantId),
      ),
    )
    .leftJoin(goldCompanies, eq(leadJourney.leadId, goldCompanies.id))
    .where(
      and(
        eq(communicationLog.tenantId, tenantId),
        sql`${communicationLog.createdAt} >= ${from}::timestamptz`,
      ),
    )
    .orderBy(desc(communicationLog.createdAt))
    .limit(20);

  const recentActivity = recentLogRows.map((r) => ({
    id: r.id,
    leadId: r.leadJourneyId,
    company: r.denumire ?? "—",
    action: `${r.direction} · ${r.channel}`,
    timestamp: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }));

  return {
    success: true as const,
    data: {
      kpis: {
        messagesSent: channelStats
          .filter((c) => c.direction === "OUTBOUND")
          .reduce((a, c) => a + c.count, 0),
        replies: channelStats
          .filter((c) => c.direction === "INBOUND")
          .reduce((a, c) => a + c.count, 0),
        conversionRate,
        activeSequences: activeSeqs?.count ?? 0,
        pendingReviews: pendingReviews?.count ?? 0,
      },
      leadFunnel,
      sentimentDistribution,
      channelPerformance,
      recentActivity,
      phones: phones.map((p) => ({
        ...p,
        dailyQuotaLimit: p.dailyNewContactLimit,
        label: p.displayName ?? p.phoneNumber,
        currentUsage: p.currentNewContactsToday,
        quotaPercentage:
          p.dailyNewContactLimit > 0
            ? Math.min(100, Math.round((p.currentNewContactsToday / p.dailyNewContactLimit) * 100))
            : 0,
      })),
    },
  };
}

type ChannelStatRow = Awaited<ReturnType<typeof loadOutreachMetrics>>["channelStats"][number];

function accumulateWhatsappOverview(
  acc: { sent: number; delivered: number; replied: number; quotaUsed: number },
  row: ChannelStatRow,
) {
  const st = String(row.status ?? "");
  if (row.direction === "OUTBOUND") acc.sent += row.count;
  if (row.direction === "INBOUND") acc.replied += row.count;
  if (st === "DELIVERED" || st === "READ" || st === "SENT") acc.delivered += row.count;
  if (st === "READ") acc.quotaUsed += row.count;
}

/** EMAIL_COLD și EMAIL_WARM au aceeași logică de agregare pe status/direcție. */
function accumulateEmailChannelOverview(
  acc: { sent: number; opened: number; replied: number; bounced: number },
  row: ChannelStatRow,
) {
  const st = String(row.status ?? "");
  if (row.direction === "OUTBOUND") acc.sent += row.count;
  if (row.direction === "INBOUND") acc.replied += row.count;
  if (st === "OPENED") acc.opened += row.count;
  if (st === "BOUNCED" || st === "FAILED") acc.bounced += row.count;
}

function aggregateChannelStatsForOverview(
  channelStats: Awaited<ReturnType<typeof loadOutreachMetrics>>["channelStats"],
) {
  const byChannel = {
    whatsapp: { sent: 0, delivered: 0, replied: 0, quotaUsed: 0 },
    emailCold: { sent: 0, opened: 0, replied: 0, bounced: 0 },
    emailWarm: { sent: 0, opened: 0, replied: 0, bounced: 0 },
  };

  for (const row of channelStats) {
    switch (row.channel) {
      case "WHATSAPP":
        accumulateWhatsappOverview(byChannel.whatsapp, row);
        break;
      case "EMAIL_COLD":
        accumulateEmailChannelOverview(byChannel.emailCold, row);
        break;
      case "EMAIL_WARM":
        accumulateEmailChannelOverview(byChannel.emailWarm, row);
        break;
      default:
        break;
    }
  }
  return byChannel;
}

// ─── Route Registration ───────────────────────────────────────────────────────

export async function outreachRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

  const outreachSendLimiter = app.rateLimit({ max: 10, timeWindow: "1 minute" });
  const outreachEnrollLimiter = app.rateLimit({ max: 50, timeWindow: "1 minute" });
  const outreachPreviewLimiter = app.rateLimit({ max: 30, timeWindow: "1 minute" });
  const outreachTakeoverLimiter = app.rateLimit({ max: 5, timeWindow: "1 minute" });

  const outreachSettingsPatchSchema = z.object({
    businessHoursStart: z.number().int().min(0).max(23).optional(),
    businessHoursEnd: z.number().int().min(0).max(24).optional(),
    workDays: z.array(z.number().int().min(1).max(7)).optional(),
    timezone: z.string().max(50).optional(),
    dailyQuotaLimit: z.number().int().positive().optional(),
    followupQuotaLimit: z.number().int().positive().optional(),
    emailSignature: z.string().max(10000).nullable().optional(),
    waReplyTimeoutMinutes: z.number().int().positive().optional(),
  });

  // ─── Settings & notifications ─────────────────────────────────────────────

  app.get("/settings", { ...authOpts }, async (_req, reply) => {
    const tenantId = requireTenantId(_req);
    const [row] = await db
      .select()
      .from(outreachSettings)
      .where(eq(outreachSettings.tenantId, tenantId))
      .limit(1);
    if (!row) {
      const [inserted] = await db.insert(outreachSettings).values({ tenantId }).returning();
      return reply.send({ success: true, data: inserted });
    }
    return reply.send({ success: true, data: row });
  });

  app.patch("/settings", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = outreachSettingsPatchSchema.parse(req.body);
    const [existing] = await db
      .select()
      .from(outreachSettings)
      .where(eq(outreachSettings.tenantId, tenantId))
      .limit(1);
    if (!existing) {
      await db.insert(outreachSettings).values({ tenantId });
    }
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.businessHoursStart !== undefined) patch.businessHoursStart = body.businessHoursStart;
    if (body.businessHoursEnd !== undefined) patch.businessHoursEnd = body.businessHoursEnd;
    if (body.workDays !== undefined) patch.workDays = body.workDays;
    if (body.timezone !== undefined) patch.timezone = body.timezone;
    if (body.dailyQuotaLimit !== undefined) patch.dailyQuotaLimit = body.dailyQuotaLimit;
    if (body.followupQuotaLimit !== undefined) patch.followupQuotaLimit = body.followupQuotaLimit;
    if (body.emailSignature !== undefined) patch.emailSignature = body.emailSignature;
    if (body.waReplyTimeoutMinutes !== undefined) {
      patch.waReplyTimeoutMinutes = body.waReplyTimeoutMinutes;
    }
    const [updated] = await db
      .update(outreachSettings)
      .set(patch as typeof outreachSettings.$inferInsert)
      .where(eq(outreachSettings.tenantId, tenantId))
      .returning();
    return reply.send({ success: true, data: updated });
  });

  app.get("/notifications", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const q = z.object({ unread: z.coerce.boolean().optional() }).parse(req.query);
    const conditions = [eq(outreachNotifications.tenantId, tenantId)];
    if (q.unread) {
      conditions.push(eq(outreachNotifications.isRead, false));
    }
    const items = await db
      .select()
      .from(outreachNotifications)
      .where(and(...conditions))
      .orderBy(desc(outreachNotifications.createdAt))
      .limit(50);

    const [{ count: unreadCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(outreachNotifications)
      .where(
        and(eq(outreachNotifications.tenantId, tenantId), eq(outreachNotifications.isRead, false)),
      );

    return reply.send({
      success: true,
      data: { items, unreadCount: unreadCount ?? 0 },
    });
  });

  app.patch("/notifications/:id/read", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const [updated] = await db
      .update(outreachNotifications)
      .set({ isRead: true })
      .where(and(eq(outreachNotifications.id, id), eq(outreachNotifications.tenantId, tenantId)))
      .returning();
    if (!updated) return reply.status(404).send({ success: false, error: "Not found" });
    return reply.send({ success: true, data: updated });
  });

  app.post("/notifications/mark-all-read", { ...authOpts }, async (_req, reply) => {
    const tenantId = requireTenantId(_req);
    await db
      .update(outreachNotifications)
      .set({ isRead: true })
      .where(
        and(eq(outreachNotifications.tenantId, tenantId), eq(outreachNotifications.isRead, false)),
      );
    return reply.send({ success: true });
  });

  // ─── Leads ────────────────────────────────────────────────────────────────

  app.post("/leads", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createOutreachLeadsSchema.parse(req.body);

    let created = 0;
    let alreadyExists = 0;
    let rejectedDnc = 0;
    let rejectedNoContact = 0;
    let notFound = 0;

    for (const goldCompanyId of body.goldCompanyIds) {
      const [company] = await db
        .select({
          id: goldCompanies.id,
          doNotContact: goldCompanies.doNotContact,
          silverId: goldCompanies.silverId,
        })
        .from(goldCompanies)
        .where(and(eq(goldCompanies.id, goldCompanyId), eq(goldCompanies.tenantId, tenantId)))
        .limit(1);

      if (!company) {
        notFound += 1;
        continue;
      }
      if (company.doNotContact) {
        rejectedDnc += 1;
        continue;
      }
      const hasContact = await companyHasReachableContact(
        tenantId,
        goldCompanyId,
        company.silverId,
      );
      if (!hasContact) {
        rejectedNoContact += 1;
        continue;
      }

      const inserted = await db
        .insert(leadJourney)
        .values({
          tenantId,
          leadId: goldCompanyId,
          currentState: "COLD",
          isNewContact: true,
        })
        .onConflictDoNothing({ target: [leadJourney.tenantId, leadJourney.leadId] })
        .returning({ id: leadJourney.id });

      if (inserted.length > 0) {
        created += 1;
      } else {
        alreadyExists += 1;
      }
    }

    return reply.send({
      success: true,
      data: {
        created,
        alreadyExists,
        rejectedDnc,
        rejectedNoContact,
        notFound,
      },
    });
  });

  /**
   * Import leads din date minimale (fără pipeline Bronze): inserează silver + gold stub + contact + lead_journey.
   * CUI lipsă → sintetic `IMP-…` unic per tenant (unique idx_gold_companies_cui_tenant).
   */
  app.post("/leads/import", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = importOutreachLeadsSchema.parse(req.body);

    let created = 0;
    let rejectedNoContact = 0;
    let rejectedDuplicate = 0;
    let errors = 0;

    for (const row of body.rows) {
      const email = row.email?.trim() ?? "";
      const telefon = row.telefon?.trim() ?? "";
      if (!email && !telefon) {
        rejectedNoContact += 1;
        continue;
      }

      const finalCui = (
        row.cui?.trim() || `IMP-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`
      ).toUpperCase();

      try {
        await db.transaction(async (tx) => {
          const dupGold = await tx
            .select({ id: goldCompanies.id })
            .from(goldCompanies)
            .where(and(eq(goldCompanies.tenantId, tenantId), eq(goldCompanies.cui, finalCui)))
            .limit(1);
          if (dupGold.length > 0) {
            throw new Error("DUPLICATE_CUI");
          }

          const [silver] = await tx
            .insert(silverCompanies)
            .values({
              tenantId,
              denumire: row.denumire,
              cui: finalCui,
              judet: row.judet?.trim() || undefined,
              email: email || undefined,
              telefon: telefon || undefined,
              enrichmentStatus: "complete",
              promotionStatus: "eligible",
              metadata: { source: "outreach_csv_import" },
            })
            .returning();

          const [gold] = await tx
            .insert(goldCompanies)
            .values({
              tenantId,
              silverId: silver.id,
              bronzeIds: [],
              cui: finalCui,
              denumire: row.denumire,
              judet: row.judet?.trim() || undefined,
            })
            .returning();

          await tx
            .update(silverCompanies)
            .set({
              promotionStatus: "promoted",
              promotedToGoldId: gold.id,
              promotedAt: new Date(),
            })
            .where(eq(silverCompanies.id, silver.id));

          await tx.insert(goldContacts).values({
            tenantId,
            companyId: gold.id,
            role: "CONTACT",
            email: email || null,
            telefon: telefon || null,
          });

          await tx
            .insert(leadJourney)
            .values({
              tenantId,
              leadId: gold.id,
              currentState: "COLD",
              isNewContact: true,
            })
            .onConflictDoNothing({ target: [leadJourney.tenantId, leadJourney.leadId] });
        });
        created += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "DUPLICATE_CUI" || msg.includes("duplicate key") || msg.includes("uq_")) {
          rejectedDuplicate += 1;
        } else {
          errors += 1;
        }
      }
    }

    return reply.send({
      success: true,
      data: {
        created,
        rejectedNoContact,
        rejectedDuplicate,
        errors,
      },
    });
  });

  app.get("/leads", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = leadsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = buildLeadJourneyListConditions(tenantId, query);

    const sortCol = resolveLeadSortColumn(query.sortBy);
    const orderFn = query.sortOrder === "asc" ? asc : desc;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(leadJourney)
        .innerJoin(goldCompanies, eq(leadJourney.leadId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(orderFn(sortCol))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(leadJourney)
        .innerJoin(goldCompanies, eq(leadJourney.leadId, goldCompanies.id))
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    const companyIds = rows.map((r) => r.gold_companies?.id).filter((x): x is string => Boolean(x));
    const primaryByCompany = await loadPrimaryContactsForGoldCompanies(tenantId, companyIds);

    return reply.send({
      success: true,
      data: rows.map((r) => {
        const gid = r.gold_companies?.id;
        const pc = gid ? (primaryByCompany.get(gid) ?? null) : null;
        return {
          ...r.lead_journey,
          company: mapOutreachCompanyPayload(r.gold_companies, pc),
        };
      }),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
        filters: { state: query.state, channel: query.channel },
      },
    });
  });

  app.get("/leads/export", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = leadsExportQuerySchema.parse(req.query);

    const conditions = buildLeadJourneyListConditions(tenantId, query);

    const sortCol = resolveLeadSortColumn(query.sortBy);
    const orderFn = query.sortOrder === "asc" ? asc : desc;

    const rows = await db
      .select()
      .from(leadJourney)
      .innerJoin(goldCompanies, eq(leadJourney.leadId, goldCompanies.id))
      .where(and(...conditions))
      .orderBy(orderFn(sortCol))
      .limit(10_000);

    const companyIds = rows.map((r) => r.gold_companies?.id).filter((x): x is string => Boolean(x));
    const primaryByCompany = await loadPrimaryContactsForGoldCompanies(tenantId, companyIds);

    const header = [
      "Company Name",
      "CUI",
      "Email",
      "Phone",
      "State",
      "Channel",
      "Last Contact",
      "Sentiment",
      "Created",
    ];
    const lines: string[] = [header.join(",")];
    for (const r of rows) {
      const gid = r.gold_companies?.id;
      const pc = gid ? (primaryByCompany.get(gid) ?? null) : null;
      const company = mapOutreachCompanyPayload(r.gold_companies, pc);
      const lj = r.lead_journey;
      lines.push(
        [
          csvEscape(company?.name),
          csvEscape(company?.cui),
          csvEscape(company?.email),
          csvEscape(company?.telefon),
          csvEscape(lj.currentState),
          csvEscape(lj.lastChannelUsed),
          csvEscape(lj.lastContactAt),
          csvEscape(lj.sentimentScore),
          csvEscape(lj.createdAt),
        ].join(","),
      );
    }

    const csv = `${lines.join("\n")}\n`;
    return reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="outreach-leads.csv"')
      .send(csv);
  });

  /** Agregat activitate (mesaje, înrolări, review) pentru timeline lead. */
  app.get("/leads/:id/activity", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const exists = await db
      .select({ id: leadJourney.id })
      .from(leadJourney)
      .where(and(eq(leadJourney.id, id), eq(leadJourney.tenantId, tenantId)))
      .limit(1);
    if (exists.length === 0) {
      return reply.status(404).send({ success: false, error: "Lead not found" });
    }

    const [msgs, enrolls, reviews] = await Promise.all([
      db
        .select({
          id: communicationLog.id,
          createdAt: communicationLog.createdAt,
          channel: communicationLog.channel,
          direction: communicationLog.direction,
          status: communicationLog.status,
          contentPreview: communicationLog.contentPreview,
        })
        .from(communicationLog)
        .where(and(eq(communicationLog.leadJourneyId, id), eq(communicationLog.tenantId, tenantId)))
        .orderBy(desc(communicationLog.createdAt))
        .limit(40),
      db
        .select()
        .from(sequenceEnrollments)
        .where(
          and(eq(sequenceEnrollments.journeyId, id), eq(sequenceEnrollments.tenantId, tenantId)),
        )
        .orderBy(desc(sequenceEnrollments.enrolledAt))
        .limit(15),
      db
        .select()
        .from(humanReviewQueue)
        .where(and(eq(humanReviewQueue.journeyId, id), eq(humanReviewQueue.tenantId, tenantId)))
        .orderBy(desc(humanReviewQueue.createdAt))
        .limit(15),
    ]);

    type Act = { type: string; description: string; timestamp: string };
    const items: Act[] = [];
    for (const m of msgs) {
      const ts = m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt);
      items.push({
        type: "message",
        description: `${m.direction} ${m.channel} [${m.status}] ${m.contentPreview ?? ""}`.trim(),
        timestamp: ts,
      });
    }
    for (const e of enrolls) {
      const ts = e.enrolledAt instanceof Date ? e.enrolledAt.toISOString() : String(e.enrolledAt);
      items.push({
        type: "enrollment",
        description: `Înrolare secvență — ${e.status}`,
        timestamp: ts,
      });
    }
    for (const r of reviews) {
      const ts = r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt);
      items.push({
        type: "review",
        description: `Review [${r.status}] ${r.reason}`,
        timestamp: ts,
      });
    }
    items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return reply.send({ success: true, data: items.slice(0, 50) });
  });

  app.get("/leads/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const rows = await db
      .select()
      .from(leadJourney)
      .leftJoin(goldCompanies, eq(leadJourney.leadId, goldCompanies.id))
      .where(and(eq(leadJourney.id, id), eq(leadJourney.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      return reply.status(404).send({ success: false, error: "Lead not found" });
    }

    const comms = await db
      .select()
      .from(communicationLog)
      .where(and(eq(communicationLog.leadJourneyId, id), eq(communicationLog.tenantId, tenantId)))
      .orderBy(asc(communicationLog.createdAt));

    const goldRow = rows[0].gold_companies;
    const goldId = goldRow?.id;
    const primaryContacts = goldId
      ? await loadPrimaryContactsForGoldCompanies(tenantId, [goldId])
      : new Map();
    const pc = goldId ? (primaryContacts.get(goldId) ?? null) : null;

    return reply.send({
      success: true,
      data: {
        ...rows[0].lead_journey,
        company: mapOutreachCompanyPayload(goldRow, pc),
        communications: comms,
      },
    });
  });

  app.patch("/leads/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = patchLeadSchema.parse(req.body);

    const existing = await db
      .select({ currentState: leadJourney.currentState })
      .from(leadJourney)
      .where(and(eq(leadJourney.id, id), eq(leadJourney.tenantId, tenantId)))
      .limit(1);

    if (existing.length === 0) {
      return reply.status(404).send({ success: false, error: "Lead not found" });
    }

    if (body.currentState) {
      const allowed = VALID_TRANSITIONS[existing[0].currentState] ?? [];
      if (!allowed.includes(body.currentState)) {
        return reply.status(400).send({
          success: false,
          error: `Invalid transition: ${existing[0].currentState} -> ${body.currentState}`,
        });
      }
    }

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (body.currentState) {
      updatePayload.currentState = body.currentState;
      updatePayload.previousState = existing[0].currentState;
      updatePayload.stateChangedAt = new Date();
    }
    if (body.assignedToUser !== undefined) updatePayload.assignedToUser = body.assignedToUser;
    if (body.isHumanControlled !== undefined)
      updatePayload.isHumanControlled = body.isHumanControlled;

    const [updated] = await db
      .update(leadJourney)
      .set(updatePayload)
      .where(and(eq(leadJourney.id, id), eq(leadJourney.tenantId, tenantId)))
      .returning();

    if (body.currentState) {
      const stateQueue = createQueue("lead:state:transition");
      await stateQueue.add("state-change", {
        journeyId: id,
        fromState: existing[0].currentState,
        toState: body.currentState,
        tenantId,
      });
    }

    return reply.send({ success: true, data: updated });
  });

  app.post(
    "/leads/:id/send-message",
    { ...authOpts, preHandler: [outreachSendLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const body = sendMessageSchema.parse(req.body);

      if (body.subject && body.channel !== "EMAIL_WARM") {
        return reply.status(400).send({
          success: false,
          error: "subject is only allowed for EMAIL_WARM channel",
        });
      }

      const lead = await db
        .select({
          currentState: leadJourney.currentState,
          assignedPhoneId: leadJourney.assignedPhoneId,
          isNewContact: leadJourney.isNewContact,
          lastChannelUsed: leadJourney.lastChannelUsed,
          firstContactChannel: leadJourney.firstContactChannel,
          firstContactAt: leadJourney.firstContactAt,
        })
        .from(leadJourney)
        .where(and(eq(leadJourney.id, id), eq(leadJourney.tenantId, tenantId)))
        .limit(1);

      if (lead.length === 0) {
        return reply.status(404).send({ success: false, error: "Lead not found" });
      }

      const resolved = await resolveOutboundQueueForSendMessage(tenantId, body, lead[0]);
      if (!resolved.ok) {
        return reply.status(resolved.status).send(resolved.body);
      }
      const { queueName } = resolved;

      const queue = createQueue(queueName);
      const delayMs = computeScheduledDelayMs(body.scheduledAt);
      const job = await queue.add(
        "send-manual-message",
        {
          journeyId: id,
          tenantId,
          channel: body.channel,
          content: body.content,
          subject: body.subject,
          templateId: body.templateId,
          scheduledAt: body.scheduledAt ?? null,
        },
        delayMs > 0 ? { delay: delayMs } : {},
      );

      return reply.send({
        success: true,
        data: {
          messageId: job.id ?? "queued",
          status: delayMs > 0 ? "SCHEDULED" : "QUEUED",
          scheduledAt: body.scheduledAt,
        },
      });
    },
  );

  app.post(
    "/leads/:id/takeover",
    { ...authOpts, preHandler: [outreachTakeoverLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const actorId = getActorId(req);
      const { id } = idParamSchema.parse(req.params);
      const body = z.object({ reason: z.string().min(1).max(1000) }).parse(req.body);

      const lead = await db
        .select({ currentState: leadJourney.currentState })
        .from(leadJourney)
        .where(and(eq(leadJourney.id, id), eq(leadJourney.tenantId, tenantId)))
        .limit(1);

      if (lead.length === 0) {
        return reply.status(404).send({ success: false, error: "Lead not found" });
      }

      if (lead[0].currentState === "CONVERTED") {
        return reply.status(400).send({
          success: false,
          error: "Cannot takeover a CONVERTED lead",
        });
      }

      const takeoverQueue = createQueue("human:takeover:initiate");
      await takeoverQueue.add("initiate-takeover", {
        journeyId: id,
        tenantId,
        userId: actorId,
        reason: body.reason,
      });

      return reply.send({ success: true, data: { success: true } });
    },
  );

  // ─── Sequences ────────────────────────────────────────────────────────────

  app.get("/sequences", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z
      .object({
        isActive: z.coerce.boolean().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(outreachSequences.tenantId, tenantId)];
    if (query.isActive !== undefined)
      conditions.push(eq(outreachSequences.isActive, query.isActive));

    const rows = await db
      .select()
      .from(outreachSequences)
      .where(and(...conditions))
      .orderBy(desc(outreachSequences.createdAt))
      .limit(query.limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(outreachSequences)
      .where(and(...conditions));

    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total: countResult?.count ?? 0 },
    });
  });

  app.get("/sequences/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [seq] = await db
      .select()
      .from(outreachSequences)
      .where(and(eq(outreachSequences.id, id), eq(outreachSequences.tenantId, tenantId)))
      .limit(1);

    if (!seq) return reply.status(404).send({ success: false, error: "Sequence not found" });

    const steps = await db
      .select()
      .from(outreachSequenceSteps)
      .where(eq(outreachSequenceSteps.sequenceId, id))
      .orderBy(asc(outreachSequenceSteps.stepNumber));

    return reply.send({ success: true, data: { ...seq, steps } });
  });

  app.post("/sequences", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createSequenceSchema.parse(req.body);

    const [seq] = await db
      .insert(outreachSequences)
      .values({
        tenantId,
        name: body.name,
        description: body.description,
        primaryChannel: mapApiEmailAggregateToChannel(body.primaryChannel),
        isActive: false,
        stopOnReply: body.stopOnReply,
        respectBusinessHours: body.respectBusinessHours,
      })
      .returning();

    for (let i = 0; i < body.steps.length; i++) {
      const step = body.steps[i];
      await db.insert(outreachSequenceSteps).values({
        sequenceId: seq.id,
        stepNumber: i + 1,
        channel: step.channel,
        templateId: step.templateId ?? null,
        delayHours: step.delayHours,
        delayMinutes: step.delayMinutes,
      });
    }

    return reply.status(201).send({ success: true, data: seq });
  });

  app.patch("/sequences/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = patchSequenceSchema.parse(req.body);

    const [existing] = await db
      .select({ id: outreachSequences.id })
      .from(outreachSequences)
      .where(and(eq(outreachSequences.id, id), eq(outreachSequences.tenantId, tenantId)))
      .limit(1);

    if (!existing) return reply.status(404).send({ success: false, error: "Sequence not found" });

    const { steps, ...meta } = body;

    if (steps !== undefined) {
      const [blocking] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(sequenceEnrollments)
        .where(
          and(
            eq(sequenceEnrollments.sequenceId, id),
            inArray(sequenceEnrollments.status, ["ACTIVE", "PAUSED"]),
          ),
        );
      if ((blocking?.c ?? 0) > 0) {
        return reply.status(400).send({
          success: false,
          error: "Cannot update steps while there are ACTIVE or PAUSED enrollments",
        });
      }
    }
    const metaPatch = Object.fromEntries(
      Object.entries(meta).filter(([, v]) => v !== undefined),
    ) as Partial<typeof meta>;

    await db.transaction(async (tx) => {
      if (Object.keys(metaPatch).length > 0) {
        await tx
          .update(outreachSequences)
          .set({ ...metaPatch, updatedAt: new Date() })
          .where(and(eq(outreachSequences.id, id), eq(outreachSequences.tenantId, tenantId)));
      }

      if (steps !== undefined) {
        await tx.delete(outreachSequenceSteps).where(eq(outreachSequenceSteps.sequenceId, id));
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await tx.insert(outreachSequenceSteps).values({
            sequenceId: id,
            stepNumber: i + 1,
            channel: step.channel,
            templateId: step.templateId ?? null,
            delayHours: step.delayHours,
            delayMinutes: step.delayMinutes,
          });
        }
        if (Object.keys(metaPatch).length === 0) {
          await tx
            .update(outreachSequences)
            .set({ updatedAt: new Date() })
            .where(and(eq(outreachSequences.id, id), eq(outreachSequences.tenantId, tenantId)));
        }
      }
    });

    const [updated] = await db
      .select()
      .from(outreachSequences)
      .where(and(eq(outreachSequences.id, id), eq(outreachSequences.tenantId, tenantId)))
      .limit(1);

    return reply.send({ success: true, data: updated });
  });

  app.post(
    "/sequences/:id/enroll",
    { ...authOpts, preHandler: [outreachEnrollLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const { id: sequenceId } = idParamSchema.parse(req.params);
      const body = enrollSchema.parse(req.body);

      const [seq] = await db
        .select({ id: outreachSequences.id })
        .from(outreachSequences)
        .where(and(eq(outreachSequences.id, sequenceId), eq(outreachSequences.tenantId, tenantId)))
        .limit(1);

      if (!seq) {
        return reply.status(404).send({ success: false, error: "Sequence not found" });
      }

      const queue = createQueue("sequence:create");
      let enrolled = 0;
      let skipped = 0;

      for (const journeyId of body.leadIds) {
        const [row] = await db
          .select({
            journeyPk: leadJourney.id,
            leadId: leadJourney.leadId,
            doNotContact: goldCompanies.doNotContact,
          })
          .from(leadJourney)
          .innerJoin(goldCompanies, eq(leadJourney.leadId, goldCompanies.id))
          .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
          .limit(1);

        if (!row) {
          skipped += 1;
          continue;
        }
        if (row.doNotContact) {
          skipped += 1;
          continue;
        }

        await queue.add(
          "enroll",
          {
            tenantId,
            sequenceId,
            journeyId: row.journeyPk,
            leadId: row.leadId,
            startAt: body.scheduledStart,
          },
          { removeOnComplete: 100 },
        );
        enrolled += 1;
      }

      return reply.send({
        success: true,
        data: { enrolled, skipped },
      });
    },
  );

  // ─── Reviews / HITL ───────────────────────────────────────────────────────

  app.get("/reviews", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = reviewQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(humanReviewQueue.tenantId, tenantId)];
    if (query.priority) conditions.push(eq(humanReviewQueue.priority, query.priority));
    if (query.status) conditions.push(eq(humanReviewQueue.status, query.status));

    const rows = await db
      .select()
      .from(humanReviewQueue)
      .where(and(...conditions))
      .orderBy(
        desc(
          sql`case when ${humanReviewQueue.priority} = 'URGENT' then 1 when ${humanReviewQueue.priority} = 'HIGH' then 2 when ${humanReviewQueue.priority} = 'MEDIUM' then 3 else 4 end`,
        ),
        asc(humanReviewQueue.slaDueAt),
      )
      .limit(query.limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(humanReviewQueue)
      .where(and(...conditions));

    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total: countResult?.count ?? 0 },
    });
  });

  app.get("/reviews/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const byPriority = await db
      .select({
        priority: humanReviewQueue.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(humanReviewQueue)
      .where(eq(humanReviewQueue.tenantId, tenantId))
      .groupBy(humanReviewQueue.priority);

    const byStatus = await db
      .select({
        status: humanReviewQueue.status,
        count: sql<number>`count(*)::int`,
      })
      .from(humanReviewQueue)
      .where(eq(humanReviewQueue.tenantId, tenantId))
      .groupBy(humanReviewQueue.status);

    const [avgRow] = await db
      .select({
        avgMs: sql<number>`coalesce(avg(extract(epoch from (${humanReviewQueue.resolvedAt} - ${humanReviewQueue.createdAt})) * 1000), 0)`,
      })
      .from(humanReviewQueue)
      .where(
        and(
          eq(humanReviewQueue.tenantId, tenantId),
          eq(humanReviewQueue.status, "RESOLVED"),
          isNotNull(humanReviewQueue.resolvedAt),
        ),
      );

    const [breachRow] = await db
      .select({
        total: sql<number>`count(*)::int`,
        breached: sql<number>`count(*) filter (where ${humanReviewQueue.slaBreached} = true)::int`,
      })
      .from(humanReviewQueue)
      .where(eq(humanReviewQueue.tenantId, tenantId));

    const total = breachRow?.total ?? 0;
    const breached = breachRow?.breached ?? 0;
    const slaBreachRate = total > 0 ? breached / total : 0;

    const [resolved7] = await db
      .select({
        n: sql<number>`count(*) filter (where ${humanReviewQueue.resolvedAt} >= now() - interval '7 days')::int`,
      })
      .from(humanReviewQueue)
      .where(and(eq(humanReviewQueue.tenantId, tenantId), eq(humanReviewQueue.status, "RESOLVED")));

    const reviewsPerDay = (resolved7?.n ?? 0) / 7;

    return reply.send({
      success: true,
      data: {
        avgResolutionTimeMs: Math.round(Number(avgRow?.avgMs ?? 0)),
        slaBreachRate,
        reviewsPerDay,
        byPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r.count])),
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
      },
    });
  });

  app.get("/reviews/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [review] = await db
      .select()
      .from(humanReviewQueue)
      .where(and(eq(humanReviewQueue.id, id), eq(humanReviewQueue.tenantId, tenantId)))
      .limit(1);

    if (!review) return reply.status(404).send({ success: false, error: "Review not found" });
    return reply.send({ success: true, data: review });
  });

  app.post("/reviews/:id/assign", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = z.object({ userId: z.uuid() }).parse(req.body);

    const [updated] = await db
      .update(humanReviewQueue)
      .set({ assignedTo: body.userId, status: "ASSIGNED", updatedAt: new Date() })
      .where(and(eq(humanReviewQueue.id, id), eq(humanReviewQueue.tenantId, tenantId)))
      .returning();

    if (!updated) return reply.status(404).send({ success: false, error: "Review not found" });
    return reply.send({ success: true, data: updated });
  });

  app.post("/reviews/:id/resolve", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const actorId = getActorId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = resolveReviewSchema.parse(req.body);

    const [updated] = await db
      .update(humanReviewQueue)
      .set({
        status: "RESOLVED",
        resolutionAction: body.action,
        resolvedAt: new Date(),
        resolvedBy: actorId,
        resolutionNotes: body.notes ?? null,
        editedContent: body.editedContent ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(humanReviewQueue.id, id), eq(humanReviewQueue.tenantId, tenantId)))
      .returning();

    if (!updated) return reply.status(404).send({ success: false, error: "Review not found" });

    const resolveQueue = createQueue("human:approve:message");
    await resolveQueue.add("resolve-review", {
      reviewId: id,
      tenantId,
      actorId,
      action: body.action,
      editedContent: body.editedContent,
      notes: body.notes,
    });

    return reply.send({ success: true, data: updated });
  });

  // ─── Templates ────────────────────────────────────────────────────────────

  app.get("/templates", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z
      .object({
        channel: z.enum(["WHATSAPP", "EMAIL"]).optional(),
        status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
        type: templateTypeFilterSchema.optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(outreachTemplates.tenantId, tenantId)];
    if (query.channel === "WHATSAPP") {
      conditions.push(eq(outreachTemplates.channel, "WHATSAPP"));
    } else if (query.channel === "EMAIL") {
      conditions.push(inArray(outreachTemplates.channel, ["EMAIL_COLD", "EMAIL_WARM"]));
    }
    if (query.status) conditions.push(eq(outreachTemplates.status, query.status));
    if (query.type) {
      const dbType = TEMPLATE_TYPE_QUERY_MAP[query.type];
      conditions.push(eq(outreachTemplates.templateType, dbType));
    }

    const rows = await db
      .select()
      .from(outreachTemplates)
      .where(and(...conditions))
      .orderBy(desc(outreachTemplates.createdAt))
      .limit(query.limit)
      .offset(offset);

    return reply.send({ success: true, data: rows });
  });

  app.get("/templates/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [tmpl] = await db
      .select()
      .from(outreachTemplates)
      .where(and(eq(outreachTemplates.id, id), eq(outreachTemplates.tenantId, tenantId)))
      .limit(1);

    if (!tmpl) return reply.status(404).send({ success: false, error: "Template not found" });
    return reply.send({ success: true, data: tmpl });
  });

  app.post("/templates", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createTemplateSchema.parse(req.body);

    const [tmpl] = await db
      .insert(outreachTemplates)
      .values({
        tenantId,
        name: body.name,
        description: body.description ?? null,
        channel: mapApiEmailAggregateToChannel(body.channel),
        subject: body.subject ?? null,
        bodyTemplate: body.bodyTemplate,
        templateType: body.templateType,
        status: "DRAFT" as const,
        variables: body.variables,
        hasMedia: body.hasMedia,
        mediaType: body.mediaType ?? null,
        mediaUrl: body.mediaUrl ?? null,
      })
      .returning();

    return reply.status(201).send({ success: true, data: tmpl });
  });

  app.patch("/templates/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = z
      .object({
        name: z.string().min(3).max(200).optional(),
        description: z.string().max(1000).optional(),
        subject: z.string().max(500).nullable().optional(),
        bodyTemplate: z.string().min(10).max(4000).optional(),
        status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
        variables: z.array(z.string()).optional(),
        hasMedia: z.boolean().optional(),
        mediaType: z.string().max(50).nullable().optional(),
        mediaUrl: z.url().nullable().optional(),
      })
      .parse(req.body);

    const [updated] = await db
      .update(outreachTemplates)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(outreachTemplates.id, id), eq(outreachTemplates.tenantId, tenantId)))
      .returning();

    if (!updated) return reply.status(404).send({ success: false, error: "Template not found" });
    return reply.send({ success: true, data: updated });
  });

  app.post(
    "/templates/:id/preview",
    { ...authOpts, preHandler: [outreachPreviewLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const body = z
        .object({ variables: z.record(z.string(), z.string()).optional() })
        .parse(req.body);

      const [tmpl] = await db
        .select({ bodyTemplate: outreachTemplates.bodyTemplate })
        .from(outreachTemplates)
        .where(and(eq(outreachTemplates.id, id), eq(outreachTemplates.tenantId, tenantId)))
        .limit(1);

      if (!tmpl) return reply.status(404).send({ success: false, error: "Template not found" });

      let preview = tmpl.bodyTemplate;
      if (body.variables) {
        for (const [k, v] of Object.entries(body.variables)) {
          const varPattern = new RegExp(
            String.raw`\{\{` + escapeRegExpMeta(k) + String.raw`\}\}`,
            "g",
          );
          preview = preview.replaceAll(varPattern, v);
        }
      }
      // Process spintax: {option1|option2} -> random pick
      const spintaxPattern = /\{([^{}]+)\}/g;
      preview = preview.replaceAll(spintaxPattern, (_match: string, group: string) => {
        const opts = group.split("|");
        return opts[Math.floor(Math.random() * opts.length)] ?? opts[0] ?? "";
      });

      return reply.send({ success: true, data: { preview } });
    },
  );

  // ─── Phones ───────────────────────────────────────────────────────────────

  app.get("/phones", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const phones = await db
      .select()
      .from(waPhoneNumbers)
      .where(eq(waPhoneNumbers.tenantId, tenantId))
      .orderBy(asc(waPhoneNumbers.priority));

    const today = new Date().toISOString().slice(0, 10);
    const phoneIds = phones.map((p) => p.id);
    const usageRows =
      phoneIds.length === 0
        ? []
        : await db
            .select()
            .from(waQuotaUsage)
            .where(
              and(
                eq(waQuotaUsage.tenantId, tenantId),
                inArray(waQuotaUsage.phoneId, phoneIds),
                eq(waQuotaUsage.usageDate, today),
              ),
            );

    /** Cotă zilnică „new contact” aliniată la ADR/worker (Redis cost=1), nu raw message count. */
    const newContactsTodayByPhone = Object.fromEntries(
      usageRows.map((u) => [u.phoneId, u.newContacts]),
    );

    return reply.send({
      success: true,
      data: phones.map((p) => {
        const limit = p.dailyNewContactLimit;
        const used = newContactsTodayByPhone[p.id] ?? p.currentNewContactsToday;
        const quotaPercentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        return {
          ...p,
          /** Alias API / UI — limita zilnică de contacte noi (coloana PG `daily_new_contact_limit`). */
          dailyQuotaLimit: limit,
          label: p.displayName ?? p.phoneNumber,
          currentUsage: used,
          quotaPercentage,
        };
      }),
    });
  });

  app.get("/phones/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [phone] = await db
      .select()
      .from(waPhoneNumbers)
      .where(and(eq(waPhoneNumbers.id, id), eq(waPhoneNumbers.tenantId, tenantId)))
      .limit(1);

    if (!phone) return reply.status(404).send({ success: false, error: "Phone not found" });

    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [todayUsage] = await db
      .select()
      .from(waQuotaUsage)
      .where(
        and(
          eq(waQuotaUsage.tenantId, tenantId),
          eq(waQuotaUsage.phoneId, id),
          eq(waQuotaUsage.usageDate, today),
        ),
      )
      .limit(1);

    const quotaHistoryRows = await db
      .select()
      .from(waQuotaUsage)
      .where(
        and(
          eq(waQuotaUsage.tenantId, tenantId),
          eq(waQuotaUsage.phoneId, id),
          gte(waQuotaUsage.usageDate, sevenDaysAgo),
        ),
      )
      .orderBy(desc(waQuotaUsage.usageDate))
      .limit(7);

    const recentLogs = await db
      .select({
        id: communicationLog.id,
        channel: communicationLog.channel,
        direction: communicationLog.direction,
        status: communicationLog.status,
        contentPreview: communicationLog.contentPreview,
        createdAt: communicationLog.createdAt,
      })
      .from(communicationLog)
      .where(and(eq(communicationLog.tenantId, tenantId), eq(communicationLog.phoneId, id)))
      .orderBy(desc(communicationLog.createdAt))
      .limit(30);

    const limit = phone.dailyNewContactLimit;
    const used = todayUsage?.newContacts ?? phone.currentNewContactsToday;
    const quotaPercentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

    return reply.send({
      success: true,
      data: {
        ...phone,
        dailyQuotaLimit: limit,
        label: phone.displayName ?? phone.phoneNumber,
        currentUsage: used,
        quotaPercentage,
        quotaHistory: quotaHistoryRows.map((r) => ({
          usageDate: r.usageDate,
          messagesSent: r.messagesSent,
          newContacts: r.newContacts,
          followUps: r.followUps,
        })),
        recentMessages: recentLogs.map((m) => ({
          id: m.id,
          channel: m.channel,
          direction: m.direction,
          status: m.status,
          contentPreview: m.contentPreview,
          createdAt: m.createdAt,
        })),
      },
    });
  });

  app.patch("/phones/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = z
      .object({
        label: z.string().max(200).optional(),
        isEnabled: z.boolean().optional(),
        priority: z.number().int().min(1).max(100).optional(),
        status: z.enum(["ACTIVE", "PAUSED"]).optional(),
      })
      .parse(req.body);

    const patch: {
      displayName?: string;
      isEnabled?: boolean;
      priority?: number;
      status?: "ACTIVE" | "PAUSED";
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (body.label !== undefined) patch.displayName = body.label;
    if (body.isEnabled !== undefined) patch.isEnabled = body.isEnabled;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.status !== undefined) patch.status = body.status;

    const [updated] = await db
      .update(waPhoneNumbers)
      .set(patch)
      .where(and(eq(waPhoneNumbers.id, id), eq(waPhoneNumbers.tenantId, tenantId)))
      .returning();

    if (!updated) return reply.status(404).send({ success: false, error: "Phone not found" });
    return reply.send({
      success: true,
      data: {
        ...updated,
        dailyQuotaLimit: updated.dailyNewContactLimit,
        label: updated.displayName ?? updated.phoneNumber,
      },
    });
  });

  app.post("/phones/:id/health-check", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const healthQueue = createQueue("monitor:phone:health");
    await healthQueue.add("manual-health-check", { phoneId: id, tenantId });

    return reply.send({ success: true, data: { queued: true } });
  });

  // ─── Analytics ────────────────────────────────────────────────────────────

  app.get("/dashboard", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z
      .object({ period: z.enum(["7d", "30d", "90d", "custom"]).default("7d") })
      .parse(req.query);

    const payload = await buildOutreachDashboardResponse(tenantId, query.period);
    return reply.send(payload);
  });

  app.get("/analytics/overview", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z
      .object({ period: z.enum(["7d", "30d", "90d", "custom"]).default("7d") })
      .parse(req.query);

    const { funnel, sentimentStats, channelStats } = await loadOutreachMetrics(
      tenantId,
      query.period,
    );
    const s = sentimentStats[0] ?? { negative: 0, neutral: 0, positive: 0 };

    const byChannel = aggregateChannelStatsForOverview(channelStats);

    const dailyRows = await db
      .select()
      .from(outreachDailyStats)
      .where(eq(outreachDailyStats.tenantId, tenantId))
      .orderBy(desc(outreachDailyStats.statDate))
      .limit(90);

    return reply.send({
      success: true,
      data: {
        period: query.period,
        byChannel,
        funnel: funnel.map((f) => ({ state: f.state, count: f.count })),
        sentiment: s,
        daily: dailyRows,
      },
    });
  });

  app.get("/analytics/daily", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z
      .object({ from: z.string().optional(), to: z.string().optional() })
      .parse(req.query);

    const conditions = [eq(outreachDailyStats.tenantId, tenantId)];
    if (query.from) conditions.push(sql`${outreachDailyStats.statDate} >= ${query.from}`);
    if (query.to) conditions.push(sql`${outreachDailyStats.statDate} <= ${query.to}`);

    const rows = await db
      .select()
      .from(outreachDailyStats)
      .where(and(...conditions))
      .orderBy(desc(outreachDailyStats.statDate))
      .limit(90);

    return reply.send({ success: true, data: rows });
  });

  /** Metrici per telefon WA (spec etapa2-api-endpoints.md §6.3). */
  app.get("/analytics/phones", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z
      .object({
        from: iso.datetime().optional(),
        to: iso.datetime().optional(),
        phoneId: z.uuid().optional(),
      })
      .parse(req.query);

    const fromDate = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = query.to ? new Date(query.to) : new Date();
    const todayStr = new Date().toISOString().slice(0, 10);

    const phoneConditions = [eq(waPhoneNumbers.tenantId, tenantId)];
    if (query.phoneId) phoneConditions.push(eq(waPhoneNumbers.id, query.phoneId));

    const phones = await db
      .select()
      .from(waPhoneNumbers)
      .where(and(...phoneConditions))
      .orderBy(asc(waPhoneNumbers.priority));

    const phonesOut: {
      id: string;
      label: string;
      phoneNumber: string;
      quotaUsed: number;
      messagesSent: number;
      repliesReceived: number;
      replyRate: number;
      avgResponseTime: number;
      status: string;
      /** Metrici suplimentare (nu sunt în snippet-ul din spec, dar utile în UI). */
      messagesDelivered: number;
      bounces: number;
      bounceRate: number;
    }[] = [];

    for (const p of phones) {
      const [comm] = await db
        .select({
          messagesSent: sql<number>`count(*) filter (where ${communicationLog.direction} = 'OUTBOUND')::int`,
          repliesReceived: sql<number>`count(*) filter (where ${communicationLog.direction} = 'INBOUND')::int`,
          messagesDelivered: sql<number>`count(*) filter (where ${communicationLog.direction} = 'OUTBOUND' and ${communicationLog.status} in ('SENT','DELIVERED','READ'))::int`,
          bounces: sql<number>`count(*) filter (where ${communicationLog.status} in ('BOUNCED','FAILED'))::int`,
        })
        .from(communicationLog)
        .where(
          and(
            eq(communicationLog.tenantId, tenantId),
            eq(communicationLog.phoneId, p.id),
            gte(communicationLog.createdAt, fromDate),
            lte(communicationLog.createdAt, toDate),
          ),
        );

      const [quotaRow] = await db
        .select({
          sum: sql<number>`coalesce(sum(${waQuotaUsage.messagesSent}), 0)::int`,
        })
        .from(waQuotaUsage)
        .where(
          and(
            eq(waQuotaUsage.tenantId, tenantId),
            eq(waQuotaUsage.phoneId, p.id),
            eq(waQuotaUsage.usageDate, todayStr),
          ),
        );

      const sent = comm?.messagesSent ?? 0;
      const replies = comm?.repliesReceived ?? 0;
      const bounced = comm?.bounces ?? 0;

      phonesOut.push({
        id: p.id,
        label: p.displayName ?? p.phoneNumber,
        phoneNumber: p.phoneNumber,
        quotaUsed: quotaRow?.sum ?? 0,
        messagesSent: sent,
        repliesReceived: replies,
        replyRate: sent > 0 ? replies / sent : 0,
        avgResponseTime: 0,
        status: p.status,
        messagesDelivered: comm?.messagesDelivered ?? 0,
        bounces: bounced,
        bounceRate: sent > 0 ? bounced / sent : 0,
      });
    }

    return reply.send({ success: true, data: { phones: phonesOut } });
  });

  // ─── Campaigns ────────────────────────────────────────────────────────────

  app.get("/campaigns", { ...authOpts }, async (req, reply) => {
    try {
      const { getInstantlyClient } = await import("@cerniq/integrations/instantly");
      const res = await getInstantlyClient().getCampaigns();
      const data = res.campaigns.map((c: Campaign) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        sent: c.sent,
        opens: c.opened,
        replies: c.replied,
        bounces: c.bounced,
        bounceRate: c.bounce_rate,
      }));
      return reply.send({ success: true, data });
    } catch (err) {
      req.log.error({ err }, "Instantly getCampaigns failed");
      return reply.send({
        success: true,
        data: [],
        meta: { instantlyUnavailable: true },
      });
    }
  });
}
