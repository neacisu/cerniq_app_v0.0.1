/**
 * Mock-uri HTTP pentru E2E Playwright: același origin ca Vite (base API gol în dev),
 * astfel încât `fetch("/api/v1/...")` este interceptat cu potrivire Playwright `route()` pe
 * căi care conțin segmentele api și v1 (atenție: în comentarii bloc evităm secvența asterisc-slash care închide `/*`).
 * Starea (ex. lista de secvențe) este în închidere per apel — izolată per pagină de test.
 */
import type { Page, Route } from "@playwright/test";

export const E2E_EMAIL = "e2e@cerniq.test";
export const E2E_PASSWORD = "e2eTest1";

const TENANT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const LEAD_JOURNEY_ID = "22222222-2222-4222-8222-222222222222";
export const GOLD_COMPANY_ID = "33333333-3333-4333-8333-333333333333";
export const IMPORT_BATCH_ID = "55555555-5555-4555-8555-555555555555";
const TEMPLATE_ID = "44444444-4444-4444-8444-444444444444";

const E2E_TOKEN = "e2e-mock-jwt-token";

/** Folosit cu `RegExp.exec` (Sonar S6594). */
export const E2E_API_MOCK_OUTREACH_SEQUENCE_PATH = /^\/api\/v1\/outreach\/sequences\/([^/]+)$/;

function fulfillJson(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function dashboardStats() {
  return {
    success: true,
    data: {
      bronze: { total: 0, pending: 0, processing: 0, promoted: 0 },
      silver: {
        total: 0,
        pending: 0,
        inProgress: 0,
        complete: 0,
        eligible: 0,
      },
      gold: { total: 0, cold: 0, engaged: 0, converted: 0 },
      approvals: { pending: 0, overdue: 0 },
      errors: { last24h: 0, critical: 0 },
      pipeline: { queueDepth: 0, failingQueues: 0 },
      hitl: { pending: 0, resolvedToday: 0, overdue: 0 },
      quality: { avgScore: 0, eligible: 0, blocked: 0 },
    },
  };
}

function outreachDashboard() {
  return {
    success: true,
    data: {
      kpis: {
        messagesSent: 0,
        replies: 0,
        conversionRate: 0,
        activeSequences: 0,
        pendingReviews: 0,
      },
      channelPerformance: [] as unknown[],
      leadFunnel: [] as unknown[],
      sentimentDistribution: [] as unknown[],
      recentActivity: [] as unknown[],
      phones: [] as unknown[],
    },
  };
}

function mockLead() {
  const now = new Date().toISOString();
  return {
    id: LEAD_JOURNEY_ID,
    tenantId: TENANT_ID,
    leadId: "66666666-6666-4666-8666-666666666666",
    companyId: GOLD_COMPANY_ID,
    currentState: "COLD",
    previousState: null,
    stateChangedAt: now,
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
    createdAt: now,
    updatedAt: now,
    company: {
      id: GOLD_COMPANY_ID,
      name: "Companie E2E SA",
      denumire: "Companie E2E SA",
      cui: "RO12345678",
      judet: "București",
      localitate: "București",
      telefon: "+40700000000",
      email: "contact@e2e.test",
      whatsappNumber: "+40700000000",
      contactName: "Ion E2E",
      website: "https://e2e.test",
    },
    communications: [
      {
        id: "77777777-7777-4777-8777-777777777777",
        journeyId: LEAD_JOURNEY_ID,
        tenantId: TENANT_ID,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        status: "DELIVERED",
        contentPreview: "Mesaj E2E de test",
        externalMessageId: "ext-1",
        threadId: null,
        phoneId: null,
        quotaCost: 1,
        sentAt: now,
        deliveredAt: now,
        readAt: null,
        createdAt: now,
      },
    ],
  };
}

function mockGoldDetail() {
  const now = new Date().toISOString();
  return {
    success: true,
    data: {
      id: GOLD_COMPANY_ID,
      denumire: "Companie E2E SA",
      cui: "RO12345678",
      judetCod: "B",
      adresa: "Str. E2E 1",
      cifraAfaceri: "100000",
      isAgricultural: false,
      assignedTo: null,
      createdAt: now,
      updatedAt: now,
      currentState: "COLD",
      leadScore: 42,
      doNotContact: false,
      email: "a@e2e.test",
      phone: "+40700111222",
      website: "https://e2e.test",
      metadata: { mock: true, enrichment: "ok" },
      journey: [] as unknown[],
    },
  };
}

function mockTemplate() {
  const now = new Date().toISOString();
  return {
    id: TEMPLATE_ID,
    tenantId: TENANT_ID,
    name: "Template E2E",
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
    createdAt: now,
    updatedAt: now,
  };
}

async function readJsonBody(route: Route): Promise<unknown> {
  const raw = route.request().postData();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}

type E2eMockCtx = { sequences: Record<string, unknown>[] };

type E2eUser = {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: string;
};

/** Răspunsuri GET fixe pentru rute `/api/v1/.../stats` (reduce ramificări în handler). */
const E2E_GET_STATS_BY_PATH: Readonly<Record<string, unknown>> = {
  "/api/v1/negotiation/stats": {
    byState: [],
    avgAiConfidence: "0",
    avgCloseProbability: "0",
  },
  "/api/v1/products/stats": {
    products: { total: 0, active: 0, withEmbeddings: 0 },
    inventory: { totalSkus: 0, totalStock: 0, reserved: 0 },
  },
  "/api/v1/orders/stats": { byStatus: [], overdue: { count: 0, totalDue: "0" } },
  "/api/v1/credit/stats": { byRisk: [], scoreStats: { avg: "0", min: 0, max: 0 } },
  "/api/v1/contracts/stats": { byStatus: [], expiringIn7Days: 0 },
  "/api/v1/shipments/stats": {
    byStatus: [],
    cod: { total: 0, collected: 0, codAmount: "0" },
  },
  "/api/v1/nurturing/stats": {
    byState: [],
    nps: { totalSent: 0, responded: 0, avgScore: "0" },
  },
  "/api/v1/churn/stats": {
    byRisk: [],
    bySignalType: [],
    sentiment: { positive: 0, neutral: 0, negative: 0 },
  },
  "/api/v1/referrals/stats": {
    byStatus: [],
    byType: [],
    consent: { total: 0, withConsent: 0 },
  },
  "/api/v1/graph/stats": {
    clusters: {
      totalClusters: 0,
      avgMemberCount: "0",
      avgModularity: "0",
      kolCount: 0,
    },
    relationships: { totalRelationships: 0 },
  },
  "/api/v1/fiscal/oblio/stats": {
    oblioByType: [],
    einvoice: { total: 0, validated: 0, pending: 0, rejected: 0 },
  },
  "/api/v1/e5/alerts/compliance/stats": {
    byRiskLevel: [],
    summary: { atRiskCount: 0, churnedCount: 0, criticalCount: 0 },
  },
};

async function tryE2eAuthRoutes(
  route: Route,
  method: string,
  pathname: string,
  e2eUser: E2eUser,
): Promise<boolean> {
  if (method === "POST" && pathname.endsWith("/api/v1/auth/login")) {
    await fulfillJson(route, { success: true, data: { token: E2E_TOKEN, user: e2eUser } });
    return true;
  }
  if (method === "GET" && pathname.endsWith("/api/v1/auth/me")) {
    await fulfillJson(route, { success: true, data: { user: e2eUser } });
    return true;
  }
  if (method === "POST" && pathname.endsWith("/api/v1/auth/refresh")) {
    await fulfillJson(route, { success: true, data: { token: E2E_TOKEN } });
    return true;
  }
  if (method === "POST" && pathname.endsWith("/api/v1/auth/logout")) {
    await fulfillJson(route, { success: true, data: { loggedOut: true } });
    return true;
  }
  return false;
}

async function tryE2eDashboardRoutes(
  route: Route,
  method: string,
  pathname: string,
): Promise<boolean> {
  if (method === "GET" && pathname === "/api/v1/dashboard/stats") {
    await fulfillJson(route, dashboardStats());
    return true;
  }
  if (method === "GET" && pathname === "/api/v1/dashboard/activity") {
    await fulfillJson(route, { success: true, data: [] });
    return true;
  }
  if (method === "GET" && pathname === "/api/v1/dashboard/daily-stats") {
    await fulfillJson(route, { success: true, data: [] });
    return true;
  }
  if (method === "GET" && pathname.startsWith("/api/v1/outreach/dashboard")) {
    await fulfillJson(route, outreachDashboard());
    return true;
  }
  return false;
}

async function tryE2eOutreachMetaRoutes(
  route: Route,
  method: string,
  pathname: string,
): Promise<boolean> {
  if (method === "GET" && pathname === "/api/v1/outreach/reviews/stats") {
    await fulfillJson(route, {
      success: true,
      data: {
        avgResolutionTimeMs: 0,
        slaBreachRate: 0,
        reviewsPerDay: 0,
        byPriority: {},
        byStatus: {},
      },
    });
    return true;
  }
  if (method === "GET" && pathname.startsWith("/api/v1/outreach/notifications")) {
    await fulfillJson(route, { success: true, data: { items: [], unreadCount: 0 } });
    return true;
  }
  if (
    method === "PATCH" &&
    pathname.includes("/api/v1/outreach/notifications/") &&
    pathname.endsWith("/read")
  ) {
    await fulfillJson(route, { success: true, data: { id: "n1" } });
    return true;
  }
  return false;
}

async function tryE2eStatsByPath(route: Route, method: string, pathname: string): Promise<boolean> {
  if (method !== "GET") return false;
  const data = E2E_GET_STATS_BY_PATH[pathname];
  if (data === undefined) return false;
  await fulfillJson(route, { success: true, data });
  return true;
}

async function tryE2eBrainRoutes(route: Route, method: string, pathname: string): Promise<boolean> {
  if (method === "GET" && pathname === "/api/v1/brain/catalog") {
    await fulfillJson(route, {
      success: true,
      data: {
        nodes: [],
        stats: {
          total: 0,
          skippedTotal: 0,
          skippedQueues: 0,
          byEtapa: {},
          bySwimlane: {},
          byNeuronType: {},
        },
      },
    });
    return true;
  }
  if (method === "GET" && pathname === "/api/v1/brain/topology") {
    await fulfillJson(route, {
      success: true,
      data: {
        nodes: [],
        edges: [],
        metadata: { totalNeurons: 0, activeNeurons: 0, lastUpdated: new Date().toISOString() },
      },
    });
    return true;
  }
  return false;
}

async function tryE2eGoldRoutes(route: Route, method: string, pathname: string): Promise<boolean> {
  if (method === "GET" && pathname === "/api/v1/gold/companies") {
    await fulfillJson(route, {
      success: true,
      data: [
        {
          id: GOLD_COMPANY_ID,
          denumire: "Companie E2E SA",
          currentState: "COLD",
          judetCod: "B",
          cifraAfaceri: "100000",
          leadScore: 50,
        },
      ],
      meta: { total: 1, limit: 25, offset: 0 },
    });
    return true;
  }
  if (method === "GET" && pathname === `/api/v1/gold/companies/${GOLD_COMPANY_ID}`) {
    await fulfillJson(route, mockGoldDetail());
    return true;
  }
  return false;
}

async function tryE2eOutreachLeadsRoutes(
  route: Route,
  method: string,
  pathname: string,
): Promise<boolean> {
  if (method === "GET" && pathname === "/api/v1/outreach/leads") {
    await fulfillJson(route, {
      success: true,
      data: [mockLead()],
      meta: { total: 1, page: 1, limit: 20, pages: 1 },
    });
    return true;
  }
  if (method === "GET" && pathname === `/api/v1/outreach/leads/${LEAD_JOURNEY_ID}`) {
    await fulfillJson(route, { success: true, data: mockLead() });
    return true;
  }
  if (method === "GET" && pathname === `/api/v1/outreach/leads/${LEAD_JOURNEY_ID}/activity`) {
    await fulfillJson(route, {
      success: true,
      data: [
        {
          type: "NOTE",
          description: "Activitate E2E",
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return true;
  }
  if (method === "GET" && pathname.startsWith("/api/v1/outreach/leads/export")) {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/csv; charset=utf-8" },
      body: "cui,denumire\nRO12345678,Companie E2E SA\n",
    });
    return true;
  }
  if (method === "GET" && pathname.startsWith("/api/v1/outreach/templates")) {
    await fulfillJson(route, { success: true, data: [mockTemplate()] });
    return true;
  }
  return false;
}

async function tryE2eSequencesRoutes(
  route: Route,
  method: string,
  pathname: string,
  ctx: E2eMockCtx,
): Promise<boolean> {
  if (method === "GET" && pathname === "/api/v1/outreach/sequences") {
    await fulfillJson(route, {
      success: true,
      data: ctx.sequences,
      meta: { total: ctx.sequences.length, page: 1, limit: 50, pages: 1 },
    });
    return true;
  }

  const seqDetail = E2E_API_MOCK_OUTREACH_SEQUENCE_PATH.exec(pathname);
  if (method === "GET" && seqDetail) {
    const id = seqDetail[1];
    const found = ctx.sequences.find((s) => s.id === id);
    if (found) {
      await fulfillJson(route, { success: true, data: found });
      return true;
    }
  }

  if (method === "POST" && pathname === "/api/v1/outreach/sequences") {
    const body = (await readJsonBody(route)) as Record<string, unknown>;
    const now = new Date().toISOString();
    const sid = "88888888-8888-4888-8888-888888888888";
    const stepsIn = (body.steps as Record<string, unknown>[]) ?? [];
    const steps = stepsIn.map((s, i) => ({
      id: `99999999-9999-4999-8999-${String(i).padStart(12, "0")}`,
      sequenceId: sid,
      stepNumber: i + 1,
      channel: s.channel,
      templateId: s.templateId ?? null,
      delayHours: s.delayHours ?? 0,
      delayMinutes: s.delayMinutes ?? 0,
      subject: null,
    }));
    const row = {
      id: sid,
      tenantId: TENANT_ID,
      name: String(body.name ?? ""),
      description: (body.description as string) ?? null,
      isActive: false,
      stopOnReply: body.stopOnReply !== false,
      respectBusinessHours: body.respectBusinessHours !== false,
      totalEnrolled: 0,
      totalCompletions: 0,
      totalConversions: 0,
      createdAt: now,
      updatedAt: now,
      steps,
    };
    ctx.sequences.push(row);
    await fulfillJson(route, { success: true, data: row });
    return true;
  }

  return false;
}

async function tryE2eImportsRoute(
  route: Route,
  method: string,
  pathname: string,
): Promise<boolean> {
  if (method === "POST" && pathname === "/api/v1/imports") {
    const now = new Date().toISOString();
    await fulfillJson(
      route,
      {
        success: true,
        data: {
          id: IMPORT_BATCH_ID,
          tenantId: TENANT_ID,
          filename: "e2e-upload.csv",
          fileSizeBytes: 12,
          status: "pending",
          importedBy: USER_ID,
          createdAt: now,
          updatedAt: now,
          metadata: {},
        },
      },
      201,
    );
    return true;
  }
  return false;
}

async function dispatchE2eApiRoute(
  route: Route,
  method: string,
  pathname: string,
  ctx: E2eMockCtx,
  e2eUser: E2eUser,
): Promise<boolean> {
  if (await tryE2eAuthRoutes(route, method, pathname, e2eUser)) return true;
  if (await tryE2eDashboardRoutes(route, method, pathname)) return true;
  if (await tryE2eOutreachMetaRoutes(route, method, pathname)) return true;
  if (await tryE2eStatsByPath(route, method, pathname)) return true;
  if (await tryE2eBrainRoutes(route, method, pathname)) return true;
  if (await tryE2eGoldRoutes(route, method, pathname)) return true;
  if (await tryE2eOutreachLeadsRoutes(route, method, pathname)) return true;
  if (await tryE2eSequencesRoutes(route, method, pathname, ctx)) return true;
  if (await tryE2eImportsRoute(route, method, pathname)) return true;
  return false;
}

/**
 * Instalează mock-uri pe `page`. Apelabil o dată per pagină (înainte de navigare).
 */
export async function installE2eApiMocks(page: Page): Promise<void> {
  const ctx: E2eMockCtx = {
    sequences: [] as Record<string, unknown>[],
  };

  const e2eUser: E2eUser = {
    id: USER_ID,
    email: E2E_EMAIL,
    name: "Utilizator E2E",
    tenantId: TENANT_ID,
    role: "operator",
  };

  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const pathname = url.pathname;

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
      return;
    }

    try {
      const handled = await dispatchE2eApiRoute(route, method, pathname, ctx, e2eUser);
      if (handled) return;

      await fulfillJson(route, { success: true, data: null });
    } catch {
      await route.continue();
    }
  });
}
