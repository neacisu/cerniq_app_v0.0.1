import { http, HttpResponse } from "msw";
import { isDemoLoginCredentials } from "@/lib/demo-auth.js";

const apiBase = "http://localhost:64010";

export const handlers = [
  http.post(`${apiBase}/api/v1/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (isDemoLoginCredentials(body ?? {})) {
      return HttpResponse.json({
        success: true,
        data: {
          token: "mock-jwt-token",
          user: { email: body.email, tenantId: "tenant-1", role: "admin" },
        },
      });
    }
    return HttpResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }),
  http.post(`${apiBase}/api/v1/auth/refresh`, () =>
    HttpResponse.json({
      success: true,
      data: {
        token: "mock-jwt-token-refreshed",
        expiresIn: "15m",
      },
    }),
  ),
  http.post(`${apiBase}/api/v1/auth/logout`, () =>
    HttpResponse.json({ success: true, data: { loggedOut: true } }),
  ),

  http.get(`${apiBase}/api/v1/auth/me`, () =>
    HttpResponse.json({
      success: true,
      data: {
        user: {
          id: "u-test",
          email: "test@cerniq.ro",
          name: "Test User",
          tenantId: "tenant-1",
          role: "admin",
        },
      },
    }),
  ),
  http.get("*/api/v1/auth/me", () =>
    HttpResponse.json({
      success: true,
      data: {
        user: {
          id: "u-test",
          email: "test@cerniq.ro",
          name: "Test User",
          tenantId: "tenant-1",
          role: "admin",
        },
      },
    }),
  ),

  http.get(`${apiBase}/api/v1/products/categories`, () =>
    HttpResponse.json({
      success: true,
      data: [
        { id: "cat-1", name: "Semințe / Grâu" },
        { id: "cat-2", name: "Pesticide / Fungicide" },
      ],
    }),
  ),
  http.get("*/api/v1/products/categories", () =>
    HttpResponse.json({
      success: true,
      data: [
        { id: "cat-1", name: "Semințe / Grâu" },
        { id: "cat-2", name: "Pesticide / Fungicide" },
      ],
    }),
  ),

  http.get(`${apiBase}/api/v1/products/stats`, () =>
    HttpResponse.json({
      success: true,
      data: {
        products: { total: 6, active: 5, withEmbeddings: 4 },
        inventory: { totalSkus: 6, totalStock: 12000, reserved: 10 },
      },
    }),
  ),
  http.get("*/api/v1/products/stats", () =>
    HttpResponse.json({
      success: true,
      data: {
        products: { total: 6, active: 5, withEmbeddings: 4 },
        inventory: { totalSkus: 6, totalStock: 12000, reserved: 10 },
      },
    }),
  ),

  http.get(`${apiBase}/api/v1/products`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? "";
    const rows = [
      {
        id: "p-001",
        sku: "SEM-GR-2026-001",
        name: "Semințe Grâu PREMIUM",
        categoryName: "Semințe / Grâu",
        unitPrice: "280.00",
        currency: "RON",
        isActive: true,
        stockAvailable: 1240,
        chunkCount: 8,
        hasEmbedding: true,
        metadata: { maxDiscount: 15 },
      },
      {
        id: "p-002",
        sku: "PEST-FUN-2026-004",
        name: "Fungicid Topsin",
        categoryName: "Pesticide / Fungicide",
        unitPrice: "185.00",
        currency: "RON",
        isActive: true,
        stockAvailable: 0,
        chunkCount: 5,
        hasEmbedding: false,
        metadata: { maxDiscount: 10 },
      },
    ];
    const filtered = search
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.sku.toLowerCase().includes(search.toLowerCase()),
        )
      : rows;
    return HttpResponse.json({
      success: true,
      data: filtered,
      meta: { page: 1, limit: 50, total: filtered.length, pages: 1 },
    });
  }),
  http.get("*/api/v1/products", ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? "";
    const rows = [
      {
        id: "p-001",
        sku: "SEM-GR-2026-001",
        name: "Semințe Grâu PREMIUM",
        categoryName: "Semințe / Grâu",
        unitPrice: "280.00",
        currency: "RON",
        isActive: true,
        stockAvailable: 1240,
        chunkCount: 8,
        hasEmbedding: true,
        metadata: { maxDiscount: 15 },
      },
      {
        id: "p-002",
        sku: "PEST-FUN-2026-004",
        name: "Fungicid Topsin",
        categoryName: "Pesticide / Fungicide",
        unitPrice: "185.00",
        currency: "RON",
        isActive: true,
        stockAvailable: 0,
        chunkCount: 5,
        hasEmbedding: false,
        metadata: { maxDiscount: 10 },
      },
    ];
    const filtered = search
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.sku.toLowerCase().includes(search.toLowerCase()),
        )
      : rows;
    return HttpResponse.json({
      success: true,
      data: filtered,
      meta: { page: 1, limit: 50, total: filtered.length, pages: 1 },
    });
  }),

  http.post(`${apiBase}/api/v1/products/search`, () =>
    HttpResponse.json({ success: true, data: { jobId: "job-test", status: "PROCESSING" } }),
  ),
  http.post("*/api/v1/products/search", () =>
    HttpResponse.json({ success: true, data: { jobId: "job-test", status: "PROCESSING" } }),
  ),

  http.get(`${apiBase}/api/v1/fiscal/oblio/documents`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "fiscal-doc-1",
          documentType: "PROFORMA",
          series: "CERN",
          number: 123,
          oblioId: "OBL-2026-0123",
          status: "PENDING",
          subtotal: "19664.71",
          vat: "3736.29",
          total: "23401.00",
          issuedAt: "2026-04-01T10:00:00.000Z",
          createdAt: "2026-04-01T10:00:00.000Z",
        },
        {
          id: "fiscal-doc-2",
          documentType: "INVOICE",
          series: "CERN",
          number: 124,
          oblioId: "OBL-2026-0124",
          status: "CREATED",
          subtotal: "10084.03",
          vat: "1915.97",
          total: "12000.00",
          issuedAt: "2026-03-28T10:00:00.000Z",
          createdAt: "2026-03-28T10:00:00.000Z",
        },
        {
          id: "fiscal-doc-3",
          documentType: "INVOICE",
          series: "CERN",
          number: 125,
          oblioId: "OBL-2026-0125",
          status: "CREATED",
          subtotal: "6890.76",
          vat: "1309.24",
          total: "8200.00",
          issuedAt: "2026-03-30T10:00:00.000Z",
          createdAt: "2026-03-30T10:00:00.000Z",
        },
        {
          id: "fiscal-doc-4",
          documentType: "INVOICE",
          series: "CERN",
          number: 120,
          oblioId: "OBL-2026-0120",
          status: "PAID",
          subtotal: "37815.13",
          vat: "7184.87",
          total: "45000.00",
          issuedAt: "2026-03-25T10:00:00.000Z",
          createdAt: "2026-03-25T10:00:00.000Z",
        },
      ],
      meta: { page: 1, limit: 100, total: 4, pages: 1 },
    }),
  ),
  http.get("*/api/v1/fiscal/oblio/documents", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "fiscal-doc-1",
          documentType: "PROFORMA",
          series: "CERN",
          number: 123,
          oblioId: "OBL-2026-0123",
          status: "PENDING",
          subtotal: "19664.71",
          vat: "3736.29",
          total: "23401.00",
          issuedAt: "2026-04-01T10:00:00.000Z",
          createdAt: "2026-04-01T10:00:00.000Z",
        },
        {
          id: "fiscal-doc-2",
          documentType: "INVOICE",
          series: "CERN",
          number: 124,
          oblioId: "OBL-2026-0124",
          status: "CREATED",
          subtotal: "10084.03",
          vat: "1915.97",
          total: "12000.00",
          issuedAt: "2026-03-28T10:00:00.000Z",
          createdAt: "2026-03-28T10:00:00.000Z",
        },
        {
          id: "fiscal-doc-3",
          documentType: "INVOICE",
          series: "CERN",
          number: 125,
          oblioId: "OBL-2026-0125",
          status: "CREATED",
          subtotal: "6890.76",
          vat: "1309.24",
          total: "8200.00",
          issuedAt: "2026-03-30T10:00:00.000Z",
          createdAt: "2026-03-30T10:00:00.000Z",
        },
        {
          id: "fiscal-doc-4",
          documentType: "INVOICE",
          series: "CERN",
          number: 120,
          oblioId: "OBL-2026-0120",
          status: "PAID",
          subtotal: "37815.13",
          vat: "7184.87",
          total: "45000.00",
          issuedAt: "2026-03-25T10:00:00.000Z",
          createdAt: "2026-03-25T10:00:00.000Z",
        },
      ],
      meta: { page: 1, limit: 100, total: 4, pages: 1 },
    }),
  ),

  http.get(`${apiBase}/api/v1/fiscal/einvoice/submissions`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          oblioDocumentId: "fiscal-doc-2",
          status: "VALIDATED",
          indexSpv: "IDX-124",
          deadlineAt: "2026-04-02T23:59:59.000Z",
          validatedAt: "2026-04-02T12:00:00.000Z",
        },
        {
          oblioDocumentId: "fiscal-doc-3",
          status: "SENDING",
          indexSpv: "IDX-125",
          deadlineAt: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          oblioDocumentId: "fiscal-doc-4",
          status: "SENT",
          indexSpv: "IDX-120",
          deadlineAt: "2026-03-30T23:59:59.000Z",
        },
      ],
      meta: { page: 1, limit: 200, total: 3, pages: 1 },
    }),
  ),
  http.get("*/api/v1/fiscal/einvoice/submissions", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          oblioDocumentId: "fiscal-doc-2",
          status: "VALIDATED",
          indexSpv: "IDX-124",
          deadlineAt: "2026-04-02T23:59:59.000Z",
          validatedAt: "2026-04-02T12:00:00.000Z",
        },
        {
          oblioDocumentId: "fiscal-doc-3",
          status: "SENDING",
          indexSpv: "IDX-125",
          deadlineAt: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          oblioDocumentId: "fiscal-doc-4",
          status: "SENT",
          indexSpv: "IDX-120",
          deadlineAt: "2026-03-30T23:59:59.000Z",
        },
      ],
      meta: { page: 1, limit: 200, total: 3, pages: 1 },
    }),
  ),

  http.get(`${apiBase}/api/v1/negotiation/stats`, () =>
    HttpResponse.json({
      success: true,
      data: {
        byState: [
          { state: "DISCOVERY", count: 2, totalValue: "0" },
          { state: "NEGOTIATION", count: 1, totalValue: "23000" },
          { state: "PAID", count: 1, totalValue: "10000" },
        ],
        avgAiConfidence: "0.72",
        avgCloseProbability: "0.45",
      },
    }),
  ),
  http.get("*/api/v1/negotiation/stats", () =>
    HttpResponse.json({
      success: true,
      data: {
        byState: [
          { state: "DISCOVERY", count: 2, totalValue: "0" },
          { state: "NEGOTIATION", count: 1, totalValue: "23000" },
          { state: "PAID", count: 1, totalValue: "10000" },
        ],
        avgAiConfidence: "0.72",
        avgCloseProbability: "0.45",
      },
    }),
  ),

  http.get(`${apiBase}/api/v1/negotiation/guardrails`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "gv-1",
          violationType: "discount",
          severity: "HIGH",
          details: { violation: "Discount peste prag", response: "Fragment răspuns AI…" },
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, limit: 100, total: 1 },
    }),
  ),
  http.get("*/api/v1/negotiation/guardrails", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "gv-1",
          violationType: "discount",
          severity: "HIGH",
          details: { violation: "Discount peste prag", response: "Fragment răspuns AI…" },
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, limit: 100, total: 1 },
    }),
  ),

  http.get(`${apiBase}/api/v1/negotiation`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          currentState: "NEGOTIATION",
          companyName: "SC AgroSud SRL",
          totalValue: "23000.00",
          leadId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
        },
      ],
      meta: { page: 1, limit: 100, total: 1, pages: 1 },
    }),
  ),
  http.get("*/api/v1/negotiation", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          currentState: "NEGOTIATION",
          companyName: "SC AgroSud SRL",
          totalValue: "23000.00",
          leadId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
        },
      ],
      meta: { page: 1, limit: 100, total: 1, pages: 1 },
    }),
  ),

  http.get(`${apiBase}/api/v1/negotiation/:id/messages`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "m1",
          role: "user",
          content: "Bună, am trimis oferta.",
          createdAt: new Date().toISOString(),
        },
        {
          id: "m2",
          role: "assistant",
          content: "✦ Sugestie: menționează livrare în 48h.",
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  ),
  http.get("*/api/v1/negotiation/:id/messages", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "m1",
          role: "user",
          content: "Bună, am trimis oferta.",
          createdAt: new Date().toISOString(),
        },
        {
          id: "m2",
          role: "assistant",
          content: "✦ Sugestie: menționează livrare în 48h.",
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  ),

  http.get(`${apiBase}/api/v1/negotiation/:id/guardrails`, () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { page: 1, limit: 50, total: 0 },
    }),
  ),
  http.get("*/api/v1/negotiation/:id/guardrails", () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { page: 1, limit: 50, total: 0 },
    }),
  ),

  http.get(`${apiBase}/api/v1/negotiation/:id`, () =>
    HttpResponse.json({
      success: true,
      data: {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        currentState: "NEGOTIATION",
        totalValue: "23000.00",
        companyName: "SC AgroSud SRL",
        company: {
          denumire: "SC AgroSud SRL",
          cui: "12345678",
          limitaCreditEur: "50000.00",
          leadScore: "82",
          categorieRisc: "LOW",
        },
        items: [],
        history: [],
      },
    }),
  ),
  http.get("*/api/v1/negotiation/:id", () =>
    HttpResponse.json({
      success: true,
      data: {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        currentState: "NEGOTIATION",
        totalValue: "23000.00",
        companyName: "SC AgroSud SRL",
        company: {
          denumire: "SC AgroSud SRL",
          cui: "12345678",
          limitaCreditEur: "50000.00",
          leadScore: "82",
          categorieRisc: "LOW",
        },
        items: [],
        history: [],
      },
    }),
  ),

  http.get(`${apiBase}/health`, () =>
    HttpResponse.json({ status: "ok", timestamp: new Date().toISOString() }),
  ),
  http.get(`${apiBase}/health/deps`, () =>
    HttpResponse.json({
      status: "ok",
      dependencies: {
        database: { status: "up", latencyMs: 1 },
        redis: { status: "up", latencyMs: 1 },
      },
    }),
  ),

  http.get(`${apiBase}/api/admin/queues`, () =>
    HttpResponse.json({
      success: true,
      data: [{ name: "cerniq.ai-processing", waiting: 0, active: 0, completed: 10, failed: 0 }],
    }),
  ),

  http.get(`${apiBase}/api/admin/system/metrics`, () =>
    HttpResponse.json({
      success: true,
      data: {
        cpu: { count: 4, loadAvg: [0.5, 0.4, 0.3] },
        memory: { used: 512, total: 1024, usagePercent: "50" },
        uptime: 3600,
        hostname: "test",
      },
    }),
  ),

  http.get(`${apiBase}/api/v1/dashboard/stats`, () =>
    HttpResponse.json({
      success: true,
      data: {
        bronze: { total: 47382 },
        silver: { total: 8941 },
        gold: { total: 1247 },
        pipeline: { queueDepth: 184000 },
      },
    }),
  ),
  http.get(`/api/v1/dashboard/stats`, () =>
    HttpResponse.json({
      success: true,
      data: {
        bronze: { total: 47382 },
        silver: { total: 8941 },
        gold: { total: 1247 },
        pipeline: { queueDepth: 184000 },
      },
    }),
  ),
  http.get(`${apiBase}/api/v1/dashboard/activity`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "a1",
          type: "pipeline_error",
          severity: "warning",
          message: "Activity test event",
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  ),
  http.get(`/api/v1/dashboard/activity`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "a1",
          type: "pipeline_error",
          severity: "warning",
          message: "Activity test event",
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  ),
  http.get(`${apiBase}/api/v1/dashboard/daily-stats`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "ds1",
          statDate: new Date().toISOString(),
          bronzeTotal: 100,
          silverTotal: 50,
          goldTotal: 10,
          enrichmentJobsCompleted: 42,
          enrichmentJobsFailed: 2,
        },
      ],
      meta: { total: 1, limit: 30, offset: 0 },
    }),
  ),
  http.get(`/api/v1/dashboard/daily-stats`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "ds1",
          statDate: new Date().toISOString(),
          bronzeTotal: 100,
          silverTotal: 50,
          goldTotal: 10,
          enrichmentJobsCompleted: 42,
          enrichmentJobsFailed: 2,
        },
      ],
      meta: { total: 1, limit: 30, offset: 0 },
    }),
  ),
];
