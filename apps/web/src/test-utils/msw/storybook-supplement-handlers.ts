/**
 * Handler-e MSW doar pentru Storybook: completări față de `handlers.ts` (Vitest)
 * — Etapa 1/2, brain, procese, outreach dashboard, agregate stats lipsă din Vitest.
 * Ordinea în `storybook-handlers.ts`: întâi Vitest, apoi aici (primul match câștigă).
 */
import { http, HttpResponse } from "msw";

const MOCK_TENANT = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const MOCK_USER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const orderStats = {
  byStatus: [{ status: "PAID", count: 2, totalAmount: "24000.00" }],
  overdue: { count: 0, totalDue: "0" },
};

const contractStats = {
  byStatus: [{ status: "DRAFT", count: 1 }],
  expiringIn7Days: 0,
};

const shipmentStats = {
  byStatus: [{ status: "DELIVERED", count: 1 }],
  cod: { total: 0, collected: 0, codAmount: "0" },
};

const nurturingStats = {
  byState: [] as {
    currentState: string;
    count: number;
    avgChurnScore: string;
    avgRevenue: string;
  }[],
  nps: { totalSent: 0, responded: 0, avgScore: "0" },
};

const referralStats = {
  byStatus: [] as { status: string; count: number }[],
  byType: [] as { referralType: string; count: number; converted: number }[],
  consent: { total: 0, withConsent: 0 },
};

const graphStats = {
  clusters: {
    totalClusters: 0,
    avgMemberCount: "0",
    avgModularity: "0",
    kolCount: 0,
  },
  relationships: { totalRelationships: 0 },
};

const brainCatalog = {
  nodes: [] as unknown[],
  stats: {
    total: 0,
    skippedTotal: 0,
    skippedQueues: 0,
    byEtapa: {} as Record<string, number>,
    bySwimlane: {} as Record<string, number>,
    byNeuronType: {} as Record<string, number>,
  },
};

const fiscalOblioStats = {
  oblioByType: [] as { documentType: string; count: number; total: string }[],
  einvoice: { total: 0, validated: 0, pending: 0, rejected: 0 },
};

const e5ComplianceStats = {
  byRiskLevel: [] as { riskLevel: string | null; count: number }[],
  summary: { atRiskCount: 0, churnedCount: 0, criticalCount: 0 },
};

const outreachDashboard = {
  kpis: {
    messagesSent: 12,
    replies: 3,
    conversionRate: 0.15,
    activeSequences: 2,
    pendingReviews: 0,
  },
  channelPerformance: [{ channel: "WHATSAPP", sent: 10, delivered: 9, replied: 2, bounced: 0 }],
  leadFunnel: [{ state: "COLD", count: 5 }],
  sentimentDistribution: [{ category: "pozitiv", count: 2 }],
  recentActivity: [
    {
      id: "ra-1",
      leadId: "lead-sb-1",
      company: "Demo SRL",
      action: "Mesaj trimis",
      timestamp: new Date().toISOString(),
    },
  ],
  phones: [] as unknown[],
};

const now = () => new Date().toISOString();

function mockLead(id: string) {
  const t = now();
  return {
    id,
    tenantId: MOCK_TENANT,
    leadId: "66666666-6666-4666-8666-666666666666",
    companyId: "33333333-3333-4333-8333-333333333333",
    currentState: "COLD",
    previousState: null,
    stateChangedAt: t,
    channel: "WHATSAPP",
    lastChannelUsed: "WHATSAPP",
    assignedPhoneId: null,
    isHumanControlled: false,
    requiresHumanReview: false,
    nextActionAt: null,
    sentimentScore: null,
    intent: null,
    engagementScore: null,
    replyCount: 0,
    lastContactAt: null,
    assignedToUser: null,
    createdAt: t,
    updatedAt: t,
    company: {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Companie Storybook SA",
      denumire: "Companie Storybook SA",
      cui: "RO12345678",
      judet: "Timiș",
      localitate: "Timișoara",
      telefon: "+40700000001",
      email: "contact@storybook.test",
      whatsappNumber: "+40700000001",
      contactName: "Ion Demo",
      website: "https://storybook.test",
    },
    communications: [] as unknown[],
  };
}

const mockImportRow = {
  id: "55555555-5555-4555-8555-555555555555",
  tenantId: MOCK_TENANT,
  filename: "demo-import.csv",
  fileSizeBytes: 1024,
  status: "completed",
  importedBy: MOCK_USER,
  createdAt: now(),
  updatedAt: now(),
  metadata: {} as Record<string, unknown>,
};

export const storybookSupplementHandlers = [
  http.post("*/api/v1/auth/refresh", () =>
    HttpResponse.json({
      success: true,
      data: { token: "storybook-refreshed-token", expiresIn: "15m" },
    }),
  ),
  http.post("*/api/v1/auth/logout", () =>
    HttpResponse.json({ success: true, data: { loggedOut: true } }),
  ),

  http.get("*/api/v1/outreach/dashboard", () =>
    HttpResponse.json({ success: true, data: outreachDashboard }),
  ),
  http.get("*/api/v1/outreach/reviews/stats", () =>
    HttpResponse.json({
      success: true,
      data: {
        avgResolutionTimeMs: 0,
        slaBreachRate: 0,
        reviewsPerDay: 0,
        byPriority: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
      },
    }),
  ),

  http.get("*/api/v1/orders/stats", () => HttpResponse.json({ success: true, data: orderStats })),
  http.get("*/api/v1/contracts/stats", () =>
    HttpResponse.json({ success: true, data: contractStats }),
  ),
  http.get("*/api/v1/shipments/stats", () =>
    HttpResponse.json({ success: true, data: shipmentStats }),
  ),
  http.get("*/api/v1/nurturing/stats", () =>
    HttpResponse.json({ success: true, data: nurturingStats }),
  ),
  http.get("*/api/v1/referrals/stats", () =>
    HttpResponse.json({ success: true, data: referralStats }),
  ),
  http.get("*/api/v1/graph/stats", () => HttpResponse.json({ success: true, data: graphStats })),
  http.get("*/api/v1/brain/catalog", () =>
    HttpResponse.json({ success: true, data: brainCatalog }),
  ),
  http.get("*/api/v1/fiscal/oblio/stats", () =>
    HttpResponse.json({ success: true, data: fiscalOblioStats }),
  ),
  http.get("*/api/v1/e5/alerts/compliance/stats", () =>
    HttpResponse.json({ success: true, data: e5ComplianceStats }),
  ),

  http.get("*/api/v1/brain/topology", () =>
    HttpResponse.json({
      success: true,
      data: {
        nodes: [],
        edges: [],
        metadata: {
          totalNeurons: 0,
          activeNeurons: 0,
          lastUpdated: new Date().toISOString(),
        },
      },
    }),
  ),
  http.get("*/api/v1/brain/nodes/:nodeKey/traces", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { nodeKey: "stub", limit: 50, total: 0 },
    }),
  ),
  http.get("*/api/v1/brain/mutations/:batchId", () =>
    HttpResponse.json({ success: true, data: [] }),
  ),
  http.get("*/api/v1/system/processes", () =>
    HttpResponse.json({
      success: true,
      data: { processes: [], activeCount: 0, queuesReachable: false },
      meta: { fetchedAt: Date.now() },
    }),
  ),

  http.get("*/api/v1/outreach/leads", () =>
    HttpResponse.json({
      success: true,
      data: [mockLead("22222222-2222-4222-8222-222222222222")],
      meta: { total: 1, page: 1, limit: 20, pages: 1 },
    }),
  ),
  http.get("*/api/v1/outreach/leads/:id", ({ params }) =>
    HttpResponse.json({ success: true, data: mockLead(String(params.id)) }),
  ),
  http.get("*/api/v1/outreach/leads/:id/activity", () =>
    HttpResponse.json({
      success: true,
      data: [{ type: "NOTE", description: "Activitate Storybook", timestamp: now() }],
    }),
  ),
  http.get("*/api/v1/outreach/sequences", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
  http.get("*/api/v1/outreach/sequences/:id", ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        id: String(params.id),
        tenantId: MOCK_TENANT,
        name: "Secvență Storybook",
        description: null,
        isActive: false,
        stopOnReply: true,
        respectBusinessHours: true,
        totalEnrolled: 0,
        totalCompletions: 0,
        totalConversions: 0,
        createdAt: now(),
        updatedAt: now(),
        steps: [],
      },
    }),
  ),
  http.get("*/api/v1/outreach/templates", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
  http.get("*/api/v1/outreach/templates/:id", ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        id: String(params.id),
        tenantId: MOCK_TENANT,
        name: "Șablon Storybook",
        description: null,
        channel: "WHATSAPP",
        subject: null,
        bodyTemplate: "Bună {{name}}",
        templateType: "INITIAL",
        status: "ACTIVE",
        variables: [] as string[],
        hasMedia: false,
        mediaType: null,
        mediaUrl: null,
        createdAt: now(),
        updatedAt: now(),
      },
    }),
  ),
  http.get("*/api/v1/outreach/phones", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
  http.get("*/api/v1/outreach/phones/:phoneId", ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        id: String(params.phoneId),
        tenantId: MOCK_TENANT,
        phoneNumber: "+40700000000",
        label: "Storybook WA",
        timelinesaiPhoneId: null,
        status: "ACTIVE",
        isEnabled: true,
        priority: 1,
        dailyQuotaLimit: 500,
        reputationScore: 0.9,
        lastHealthCheckAt: null,
        createdAt: now(),
        updatedAt: now(),
      },
    }),
  ),
  http.get("*/api/v1/outreach/campaigns", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
  http.get("*/api/v1/outreach/analytics/overview", () =>
    HttpResponse.json({
      success: true,
      data: {
        period: "7d",
        byChannel: {
          whatsapp: { sent: 0, delivered: 0, replied: 0, quotaUsed: 0 },
          emailCold: { sent: 0, opened: 0, replied: 0, bounced: 0 },
          emailWarm: { sent: 0, opened: 0, replied: 0, bounced: 0 },
        },
        funnel: [],
        sentiment: { negative: 0, neutral: 0, positive: 0 },
        daily: [],
      },
    }),
  ),
  http.get("*/api/v1/outreach/reviews", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
  http.get("*/api/v1/outreach/settings", () =>
    HttpResponse.json({
      success: true,
      data: {
        defaultBusinessHours: { start: "09:00", end: "18:00" },
        quietHoursEnabled: false,
      },
    }),
  ),

  http.get("*/api/v1/imports", () =>
    HttpResponse.json({
      success: true,
      data: [mockImportRow],
      meta: { total: 1, limit: 50, offset: 0 },
    }),
  ),
  http.get("*/api/v1/imports/:id", ({ params }) =>
    HttpResponse.json({
      success: true,
      data: { ...mockImportRow, id: String(params.id) },
    }),
  ),
  http.get("*/api/v1/imports/:id/rows", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, limit: 50, offset: 0 },
    }),
  ),
  http.get("*/api/v1/imports/template/columns", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          header: "email",
          required: true,
          description: "Email",
          example: "a@b.ro",
          autoMapped: true,
        },
      ],
    }),
  ),
  http.get("*/api/v1/imports/mapping-targets", () =>
    HttpResponse.json({
      success: true,
      data: [{ value: "email", label: "Email", entity: "contact" }],
    }),
  ),
  http.get("*/api/v1/imports/:id/headers", () =>
    HttpResponse.json({
      success: true,
      data: { sheets: [{ sheetName: "Sheet1", headers: ["email", "telefon"] }] },
    }),
  ),
  http.get("*/api/v1/imports/:id/promote-job-status", () =>
    HttpResponse.json({
      success: true,
      data: { status: "idle", processed: 0, total: 0 },
    }),
  ),
  http.get("*/api/v1/imports/:batchId/pipeline-status", () =>
    HttpResponse.json({
      success: true,
      data: {
        stages: [],
        promotionMetrics: { processed: 0, total: 0 },
      },
    }),
  ),
  http.get("*/api/v1/imports/:batchId/runtime-topology", () =>
    HttpResponse.json({ success: true, data: { nodes: [], edges: [] } }),
  ),
  http.get("*/api/v1/imports/control", () =>
    HttpResponse.json({
      success: true,
      data: { paused: false, pausedAt: null, reason: null },
    }),
  ),
  http.get("*/api/v1/imports/:batchId/job-logs", () =>
    HttpResponse.json({ success: true, data: [], meta: { total: 0 } }),
  ),

  http.get("*/api/v1/bronze/contacts", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
  http.get("*/api/v1/bronze/contacts/:id", ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        id: String(params.id),
        tenantId: MOCK_TENANT,
        email: "bronze@storybook.test",
        rawPayload: {},
        createdAt: now(),
      },
    }),
  ),

  http.get("*/api/v1/silver/companies", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
  http.get("*/api/v1/silver/companies/:id", ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        id: String(params.id),
        tenantId: MOCK_TENANT,
        denumire: "Silver Storybook SRL",
        cui: "RO11111111",
        createdAt: now(),
      },
    }),
  ),

  http.get("*/api/v1/gold/companies", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
  http.get("*/api/v1/gold/companies/:id", ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        id: String(params.id),
        tenantId: MOCK_TENANT,
        denumire: "Gold Storybook SA",
        cui: "RO22222222",
        currentState: "COLD",
        leadScore: 50,
        createdAt: now(),
        journey: [],
      },
    }),
  ),

  http.get("*/api/v1/silver/contacts", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
  http.get("*/api/v1/gold/contacts", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),

  http.get("*/api/v1/enrichment/approvals", () => HttpResponse.json({ success: true, data: [] })),
  http.get("*/api/v1/enrichment/approvals/stats", () =>
    HttpResponse.json({
      success: true,
      data: { pending: 0, overdue: 0, resolvedToday: 0 },
    }),
  ),
  http.get("*/api/v1/enrichment/approvals/:id", ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        id: String(params.id),
        tenantId: MOCK_TENANT,
        type: "dedup",
        status: "pending",
        reason: "demo",
        createdAt: now(),
      },
    }),
  ),
  http.get("*/api/v1/enrichment/queues", () => HttpResponse.json({ success: true, data: [] })),
  http.get("*/api/v1/enrichment/queues/:name", () =>
    HttpResponse.json({
      success: true,
      data: { name: "default", depth: 0, processing: 0 },
    }),
  ),

  http.get("*/api/v1/silver/dedup/candidates", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0 },
    }),
  ),

  http.get("*/api/v1/notifications", () =>
    HttpResponse.json({
      success: true,
      data: { items: [], unreadCount: 0 },
    }),
  ),
  http.patch("*/api/v1/notifications/:id/read", () =>
    HttpResponse.json({ success: true, data: { ok: true } }),
  ),
  http.post("*/api/v1/notifications/read-all", () =>
    HttpResponse.json({ success: true, data: { ok: true } }),
  ),

  http.get("*/api/v1/offers", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
  http.get("*/api/v1/invoices", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
  http.get("*/api/v1/payments", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50, pages: 0 },
    }),
  ),
];
