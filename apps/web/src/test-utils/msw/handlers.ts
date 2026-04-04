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

  // ─── E4 orders / credit / contracts / shipments (Vitest + MSW, aliniat la etapa4-api) ───
  http.get("*/api/v1/orders", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "ord-agr-1",
          tenantId: "tenant-1",
          leadId: "lead-1",
          orderNumber: "CMD-2024-0892",
          status: "PAID",
          paymentMethod: "BANK_TRANSFER",
          totalAmount: "12450.00",
          amountPaid: "12450.00",
          amountDue: "0",
          currency: "RON",
          paymentDueAt: null,
          companyName: "SC Agriland Distribution SRL",
          cui: "RO12345678",
          createdAt: "2026-03-15T10:00:00.000Z",
          updatedAt: "2026-03-20T10:00:00.000Z",
        },
        {
          id: "ord-farm-2",
          tenantId: "tenant-1",
          leadId: "lead-2",
          orderNumber: "CMD-2024-0893",
          status: "IN_TRANSIT",
          paymentMethod: "COD",
          totalAmount: "8900.00",
          amountPaid: "0",
          amountDue: "8900.00",
          currency: "RON",
          paymentDueAt: null,
          companyName: "Ferma Sud SA",
          cui: "RO87654321",
          createdAt: "2026-03-18T10:00:00.000Z",
          updatedAt: "2026-03-22T10:00:00.000Z",
        },
      ],
      meta: { page: 1, limit: 100, total: 2, pages: 1 },
    }),
  ),

  http.get("*/api/v1/credit/profiles", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "cp-1",
          tenantId: "tenant-1",
          clientId: "client-agr",
          creditScore: 78,
          riskTier: "PREMIUM",
          creditLimit: "500000.00",
          creditUsed: "125000.00",
          scoreComponents: {
            anafStatus: 85,
            financialHealth: 72,
            bpiStatus: 80,
            paymentHistory: 75,
            litigation: 90,
            fiscalCompliance: 70,
          },
          bpiStatus: "VERIFIED",
          autoRefreshEnabled: true,
          nextReviewAt: "2026-12-01T00:00:00.000Z",
          companyName: "SC Agritech Solutions SRL",
          cui: "RO11223344",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      meta: { page: 1, limit: 100, total: 1, pages: 1 },
    }),
  ),

  http.get("*/api/v1/credit/stats", () =>
    HttpResponse.json({
      success: true,
      data: {
        byRisk: [{ riskTier: "PREMIUM", count: 1, totalLimit: "500000", totalUsed: "125000" }],
        scoreStats: { avg: "78", min: 78, max: 78 },
      },
    }),
  ),

  http.get("*/api/v1/contracts", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "ctr-draft-1",
          tenantId: "tenant-1",
          clientId: "c1",
          orderId: "ord-agr-1",
          riskTier: "LOW",
          status: "DRAFT",
          docusignEnvelopeId: null,
          docusignStatus: null,
          pdfUrl: null,
          signedPdfUrl: null,
          clausesUsed: ["MANDATORY_OBJECT", "STANDARD_PAYMENT", "CUSTOM_DELIVERY"],
          validForDays: 30,
          expiresAt: "2026-12-31T00:00:00.000Z",
          signedAt: null,
          companyName: "SC Agri Contract SRL",
          cui: "RO99887766",
          orderNumber: "CMD-2024-0892",
          createdAt: "2026-03-10T00:00:00.000Z",
          updatedAt: "2026-03-10T00:00:00.000Z",
        },
        {
          id: "ctr-signed-1",
          tenantId: "tenant-1",
          clientId: "c2",
          orderId: "ord-farm-2",
          riskTier: "MEDIUM",
          status: "SIGNED",
          docusignEnvelopeId: "env-abc-123",
          docusignStatus: "SIGNED",
          pdfUrl: "https://example.com/c.pdf",
          signedPdfUrl: "https://example.com/c-signed.pdf",
          clausesUsed: ["MANDATORY_OBJECT"],
          validForDays: 30,
          expiresAt: "2027-01-01T00:00:00.000Z",
          signedAt: "2026-03-12T00:00:00.000Z",
          companyName: "Ferma Sud SA",
          cui: "RO87654321",
          orderNumber: "CMD-2024-0893",
          createdAt: "2026-03-08T00:00:00.000Z",
          updatedAt: "2026-03-12T00:00:00.000Z",
        },
      ],
      meta: { page: 1, limit: 100, total: 2, pages: 1 },
    }),
  ),

  http.post("*/api/v1/contracts/:contractId/send-docusign", () =>
    HttpResponse.json({ success: true, data: { jobId: "job-docusign-test" } }),
  ),

  http.get("*/api/v1/shipments", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "ship-1",
          orderId: "ord-1",
          awbNumber: "SDY-987654321",
          carrier: "SAMEDAY",
          status: "PICKED_UP",
          codType: "NONE",
          codAmount: "0",
          currency: "RON",
          labelPdfUrl: null,
          estimatedDelivery: "2026-04-05T00:00:00.000Z",
          orderNumber: "CMD-1",
          companyName: "SC Agriland Distribution SRL",
          createdAt: "2026-03-20T00:00:00.000Z",
        },
        {
          id: "ship-2",
          orderId: "ord-2",
          awbNumber: "SDY-123456789",
          carrier: "SAMEDAY",
          status: "IN_TRANSIT",
          codType: "AMOUNT",
          codAmount: "150.00",
          currency: "RON",
          labelPdfUrl: null,
          estimatedDelivery: "2026-04-06T00:00:00.000Z",
          orderNumber: "CMD-2",
          companyName: "AgroSud SRL",
          createdAt: "2026-03-21T00:00:00.000Z",
        },
        {
          id: "ship-3",
          orderId: "ord-3",
          awbNumber: "SDY-555000111",
          carrier: "SAMEDAY",
          status: "DELIVERED",
          codType: "NONE",
          codAmount: "0",
          currency: "RON",
          labelPdfUrl: null,
          estimatedDelivery: "2026-03-25T00:00:00.000Z",
          orderNumber: "CMD-3",
          companyName: "Farm Vest SA",
          createdAt: "2026-03-19T00:00:00.000Z",
        },
      ],
      meta: { page: 1, limit: 100, total: 3, pages: 1 },
    }),
  ),

  http.get("*/api/v1/shipments/:id", ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        id: String(params.id),
        orderId: "ord-1",
        awbNumber: "SDY-987654321",
        carrier: "SAMEDAY",
        status: "PICKED_UP",
        codType: "NONE",
        codAmount: "0",
        currency: "RON",
        labelPdfUrl: null,
        estimatedDelivery: "2026-04-05T00:00:00.000Z",
        orderNumber: "CMD-1",
        companyName: "SC Agriland Distribution SRL",
        createdAt: "2026-03-20T00:00:00.000Z",
        trackingUrl: null,
        weight: null,
        deliveryAddress: null,
        trackingEvents: [],
        codCollections: [],
      },
    }),
  ),

  // ─── E5 referrals (ReferralManager + Referrals KOL + Vitest) ───
  http.get("*/api/v1/referrals", ({ request }) => {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status");
    const consentQ = url.searchParams.get("consentGiven");
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const now = "2026-03-01T12:00:00.000Z";
    const exp = "2027-01-01T00:00:00.000Z";
    const allRows = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        tenantId: "tenant-1",
        referrerId: "r1",
        referredId: "r1b",
        referralType: "B2B",
        status: "ACTIVE",
        consentGiven: true,
        consentGivenAt: "2026-01-05T10:00:00.000Z",
        rewardType: null,
        rewardValue: null,
        rewardIssuedAt: null,
        expiresAt: exp,
        createdAt: now,
        updatedAt: now,
        referrerName: "SC Farm Tecuci SA",
        referrerCui: "RO10000001",
        referredName: "Filiala Nord SRL",
        referredCui: "RO10000002",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        tenantId: "tenant-1",
        referrerId: "r2",
        referredId: "r2b",
        referralType: "B2B",
        status: "PENDING_CONSENT",
        consentGiven: false,
        consentGivenAt: null,
        rewardType: null,
        rewardValue: null,
        rewardIssuedAt: null,
        expiresAt: exp,
        createdAt: now,
        updatedAt: now,
        referrerName: "Grup Agrar Iași SRL",
        referrerCui: "RO20000002",
        referredName: "Prospect Delta SA",
        referredCui: "RO20000003",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        tenantId: "tenant-1",
        referrerId: "r3",
        referredId: "r3b",
        referralType: "B2B",
        status: "DECLINED",
        consentGiven: false,
        consentGivenAt: null,
        rewardType: null,
        rewardValue: null,
        rewardIssuedAt: null,
        expiresAt: exp,
        createdAt: now,
        updatedAt: now,
        referrerName: "Beta Agro SA",
        referrerCui: "RO30000003",
        referredName: "Prospect Respins SRL",
        referredCui: "RO30000004",
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        tenantId: "tenant-1",
        referrerId: "r4",
        referredId: "r4b",
        referralType: "B2B",
        status: "CONVERTED",
        consentGiven: true,
        consentGivenAt: "2026-02-01T10:00:00.000Z",
        rewardType: "CASH",
        rewardValue: "450",
        rewardIssuedAt: null,
        expiresAt: exp,
        createdAt: now,
        updatedAt: now,
        referrerName: "Gamma Farm SRL",
        referrerCui: "RO40000004",
        referredName: "Client Convertit SA",
        referredCui: "RO40000005",
      },
      {
        id: "55555555-5555-4555-8555-555555555555",
        tenantId: "tenant-1",
        referrerId: "r5",
        referredId: "r5b",
        referralType: "B2B",
        status: "CONVERTED",
        consentGiven: true,
        consentGivenAt: "2026-02-10T10:00:00.000Z",
        rewardType: "CASH",
        rewardValue: "630",
        rewardIssuedAt: "2026-02-15T10:00:00.000Z",
        expiresAt: exp,
        createdAt: now,
        updatedAt: now,
        referrerName: "SC Agro Excel SRL",
        referrerCui: "RO50000005",
        referredName: "Client Recompensat SRL",
        referredCui: "RO50000006",
      },
    ];
    let filtered = allRows;
    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    if (consentQ === "true") {
      filtered = filtered.filter((r) => r.consentGiven);
    }
    if (consentQ === "false") {
      filtered = filtered.filter((r) => !r.consentGiven);
    }
    const total = filtered.length;
    const offset = (page - 1) * limit;
    const data = filtered.slice(offset, offset + limit);
    return HttpResponse.json({
      success: true,
      data,
      meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  }),

  // ─── E5 nurturing / churn / graph (NurturingDashboard, churn, nurturing, referrals) ───
  http.get("*/api/v1/nurturing/states", ({ request }) => {
    const url = new URL(request.url);
    const currentState = url.searchParams.get("currentState");
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const MOCK_TOTALS: Record<string, number> = {
      ONBOARDING: 2,
      NURTURING_ACTIVE: 40,
      AT_RISK: 5,
      CHURNED: 3,
      REACTIVATED: 1,
      LOYAL_CLIENT: 12,
      ADVOCATE: 2,
    };
    if (currentState && currentState in MOCK_TOTALS) {
      return HttpResponse.json({
        success: true,
        data: [],
        meta: {
          page,
          limit,
          total: MOCK_TOTALS[currentState],
          pages: 1,
        },
      });
    }
    const row = {
      id: "ns-1",
      leadId: "11111111-1111-4111-8111-111111111111",
      tenantId: "tenant-1",
      currentState: "NURTURING_ACTIVE",
      churnRiskScore: 12,
      churnRiskLevel: "LOW",
      totalOrders: 3,
      totalRevenue: "12000.00",
      daysSinceLastOrder: 5,
      npsScore: 8,
      satisfactionTrend: "STABLE",
      successfulReferrals: 0,
      neighborCount: 2,
      isAdvocate: false,
      isKol: false,
      lastInteractionAt: "2026-03-20T10:00:00.000Z",
      companyName: "SC Demo Farm SRL",
      cui: "RO123",
      judet: "IL",
    };
    return HttpResponse.json({
      success: true,
      data: [row],
      meta: { page: 1, limit: 100, total: 1, pages: 1 },
    });
  }),

  http.post("*/api/v1/nurturing/states/:leadId/evaluate", () =>
    HttpResponse.json({ success: true, data: { jobId: "mock-nurturing-eval" } }),
  ),

  http.get("*/api/v1/churn/factors", ({ request }) => {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const allFactors = [
      {
        id: "cf-1",
        leadId: "22222222-2222-4222-8222-222222222222",
        tenantId: "tenant-1",
        overallChurnScore: 72,
        riskLevel: "HIGH",
        factorBreakdown: { ORDER_FREQUENCY_DROP: 0.3 },
        activeSignalCount: 2,
        lastCalculatedAt: "2026-03-22T10:00:00.000Z",
        companyName: "Cooperativa Test",
        cui: "RO999",
        judet: "TM",
      },
      {
        id: "cf-2",
        leadId: "33333333-3333-4333-8333-333333333333",
        tenantId: "tenant-1",
        overallChurnScore: 44,
        riskLevel: "MEDIUM",
        factorBreakdown: {},
        activeSignalCount: 1,
        lastCalculatedAt: "2026-03-21T10:00:00.000Z",
        companyName: "SC Agro Mid SRL",
        cui: "RO888",
        judet: "TM",
      },
      {
        id: "cf-3",
        leadId: "44444444-4444-4444-8444-444444444444",
        tenantId: "tenant-1",
        overallChurnScore: 18,
        riskLevel: "LOW",
        factorBreakdown: {},
        activeSignalCount: 0,
        lastCalculatedAt: "2026-03-20T10:00:00.000Z",
        companyName: "OUAI Demo",
        cui: "RO777",
        judet: "IL",
      },
    ];
    if (page > 1) {
      return HttpResponse.json({
        success: true,
        data: [],
        meta: { page, limit: 100, total: allFactors.length, pages: 1 },
      });
    }
    return HttpResponse.json({
      success: true,
      data: allFactors,
      meta: { page: 1, limit: 100, total: allFactors.length, pages: 1 },
    });
  }),

  http.get("*/api/v1/churn/stats", () =>
    HttpResponse.json({
      success: true,
      data: {
        byRisk: [
          { riskLevel: "CRITICAL", count: 0, avgScore: "0" },
          { riskLevel: "HIGH", count: 1, avgScore: "72" },
          { riskLevel: "MEDIUM", count: 1, avgScore: "44" },
          { riskLevel: "LOW", count: 1, avgScore: "18" },
        ],
        bySignalType: [{ signalType: "ORDER_FREQUENCY_DROP", count: 1, avgStrength: "40" }],
        sentiment: { positive: 1, neutral: 0, negative: 0 },
      },
    }),
  ),

  http.post("*/api/v1/churn/:leadId/evaluate", () =>
    HttpResponse.json({ success: true, data: { jobId: "mock-churn-eval" } }),
  ),

  http.get("*/api/v1/graph/kol-profiles", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          clusterId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          clusterName: "Cluster Sud",
          modularityScore: "0.42",
          memberCount: 18,
          detectionMethod: "LEIDEN",
          kolClientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          companyName: "SC KOL Alpha SRL",
          cui: "RO111",
          judet: "AG",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
        {
          clusterId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          clusterName: "Cluster Nord",
          modularityScore: "0.31",
          memberCount: 10,
          detectionMethod: "LEIDEN",
          kolClientId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          companyName: "SC KOL Beta SRL",
          cui: "RO222",
          judet: "BH",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      meta: { page: 1, limit: 100, total: 2, pages: 1 },
    }),
  ),

  http.get("*/api/v1/graph/relationships", () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: "rel-1",
          tenantId: "tenant-1",
          entityAId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          entityBId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          relationType: "NEIGHBOR",
          confidence: "0.85",
        },
      ],
      meta: { page: 1, limit: 500, total: 1, pages: 1 },
    }),
  ),
];
