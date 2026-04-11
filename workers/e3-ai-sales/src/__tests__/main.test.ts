/**
 * main.test.ts
 * Teste pentru funcțiile de bootstrap și ownership ale E3 AI Sales worker.
 *
 * Verifică:
 *  - assertE3ProcessorsOwnership() validează că toți procesorii au chei E3
 *  - assertE3ProcessorsOwnership() aruncă eroare pentru cozi non-E3
 *  - processors map are exact 75 intrări (A1-A6, B7-B12, C13-C18, D19-D26,
 *    E27-E32, F33-F38, G39-G45, H46-H50, I51-I55, J56-J60, K61-K65, L66-L70, M71-M75)
 *  - Niciun key din processors nu se repetă
 */
import { describe, it, expect, vi } from "vitest";

// ── Mock toți procesori individuali (70 fișiere de worker) ──────────────────────
vi.mock("../workers/a1-product-ingest.js", () => ({ productIngestProcessor: vi.fn() }));
vi.mock("../workers/a2-product-embed.js", () => ({ productEmbedProcessor: vi.fn() }));
vi.mock("../workers/a3-product-chunk.js", () => ({ productChunkProcessor: vi.fn() }));
vi.mock("../workers/a4-product-index-rebuild.js", () => ({
  productIndexRebuildProcessor: vi.fn(),
}));
vi.mock("../workers/a5-product-category-sync.js", () => ({
  productCategorySyncProcessor: vi.fn(),
}));
vi.mock("../workers/a6-product-variant-process.js", () => ({
  productVariantProcessProcessor: vi.fn(),
}));

vi.mock("../workers/b7-search-query-rewrite.js", () => ({
  searchQueryRewriteProcessor: vi.fn(),
}));
vi.mock("../workers/b8-search-vector-execute.js", () => ({
  searchVectorExecuteProcessor: vi.fn(),
}));
vi.mock("../workers/b9-search-bm25-execute.js", () => ({
  searchBm25ExecuteProcessor: vi.fn(),
}));
vi.mock("../workers/b10-search-rrf-fuse.js", () => ({ searchRrfFuseProcessor: vi.fn() }));
vi.mock("../workers/b11-search-filter-apply.js", () => ({ searchFilterApplyProcessor: vi.fn() }));
vi.mock("../workers/b12-search-cache-manage.js", () => ({ searchCacheManageProcessor: vi.fn() }));

vi.mock("../workers/c13-ai-context-build.js", () => ({ aiContextBuildProcessor: vi.fn() }));
vi.mock("../workers/c14-ai-agent-orchestrate.js", () => ({
  aiAgentOrchestrateProcessor: vi.fn(),
}));
vi.mock("../workers/c15-ai-response-generate.js", () => ({
  aiResponseGenerateProcessor: vi.fn(),
}));
vi.mock("../workers/c16-ai-response-validate.js", () => ({
  aiResponseValidateProcessor: vi.fn(),
}));
vi.mock("../workers/c17-ai-conversation-store.js", () => ({
  aiConversationStoreProcessor: vi.fn(),
}));
vi.mock("../workers/c18-ai-retry-regenerate.js", () => ({
  aiRetryRegenerateProcessor: vi.fn(),
}));

vi.mock("../workers/d19-negotiation-state-transition.js", () => ({
  negotiationStateTransitionProcessor: vi.fn(),
}));
vi.mock("../workers/d20-negotiation-history-log.js", () => ({
  negotiationHistoryLogProcessor: vi.fn(),
}));
vi.mock("../workers/d21-negotiation-items-update.js", () => ({
  negotiationItemsUpdateProcessor: vi.fn(),
}));
vi.mock("../workers/d22-negotiation-reminder-send.js", () => ({
  negotiationReminderSendProcessor: vi.fn(),
}));
vi.mock("../workers/d23-negotiation-expire-check.js", () => ({
  negotiationExpireCheckProcessor: vi.fn(),
}));
vi.mock("../workers/d24-negotiation-close-execute.js", () => ({
  negotiationCloseExecuteProcessor: vi.fn(),
}));
vi.mock("../workers/d25-negotiation-reopen-request.js", () => ({
  negotiationReopenRequestProcessor: vi.fn(),
}));
vi.mock("../workers/d26-negotiation-abandon-process.js", () => ({
  negotiationAbandonProcessProcessor: vi.fn(),
}));

vi.mock("../workers/e27-pricing-discount-calculate.js", () => ({
  pricingDiscountCalculateProcessor: vi.fn(),
}));
vi.mock("../workers/e28-pricing-discount-apply.js", () => ({
  pricingDiscountApplyProcessor: vi.fn(),
}));
vi.mock("../workers/e29-pricing-discount-approve.js", () => ({
  pricingDiscountApproveProcessor: vi.fn(),
}));
vi.mock("../workers/e30-pricing-margin-check.js", () => ({
  pricingMarginCheckProcessor: vi.fn(),
}));
vi.mock("../workers/e31-pricing-volume-calculate.js", () => ({
  pricingVolumeCalculateProcessor: vi.fn(),
}));
vi.mock("../workers/e32-pricing-competitor-check.js", () => ({
  pricingCompetitorCheckProcessor: vi.fn(),
}));

vi.mock("../workers/f33-stock-realtime-check.js", () => ({
  stockRealtimeCheckProcessor: vi.fn(),
}));
vi.mock("../workers/f34-stock-reserve-create.js", () => ({
  stockReserveCreateProcessor: vi.fn(),
}));
vi.mock("../workers/f35-stock-reserve-release.js", () => ({
  stockReserveReleaseProcessor: vi.fn(),
}));
vi.mock("../workers/f36-stock-sync-erp.js", () => ({ stockSyncErpProcessor: vi.fn() }));
vi.mock("../workers/f37-stock-low-alert.js", () => ({ stockLowAlertProcessor: vi.fn() }));
vi.mock("../workers/f38-stock-replenish-request.js", () => ({
  stockReplenishRequestProcessor: vi.fn(),
}));

vi.mock("../workers/g39-oblio-proforma-create.js", () => ({
  oblioProformaCreateProcessor: vi.fn(),
}));
vi.mock("../workers/g40-oblio-proforma-update.js", () => ({
  oblioProformaUpdateProcessor: vi.fn(),
}));
vi.mock("../workers/g41-oblio-invoice-create.js", () => ({
  oblioInvoiceCreateProcessor: vi.fn(),
}));
vi.mock("../workers/g42-oblio-invoice-cancel.js", () => ({
  oblioInvoiceCancelProcessor: vi.fn(),
}));
vi.mock("../workers/g43-oblio-client-validate.js", () => ({
  oblioClientValidateProcessor: vi.fn(),
}));
vi.mock("../workers/g44-oblio-stock-sync.js", () => ({ oblioStockSyncProcessor: vi.fn() }));
vi.mock("../workers/g45-oblio-webhook-process.js", () => ({
  oblioWebhookProcessProcessor: vi.fn(),
}));

vi.mock("../workers/h46-einvoice-send.js", () => ({ einvoiceSendProcessor: vi.fn() }));
vi.mock("../workers/h47-einvoice-status-check.js", () => ({
  einvoiceStatusCheckProcessor: vi.fn(),
}));
vi.mock("../workers/h48-einvoice-deadline-monitor.js", () => ({
  einvoiceDeadlineMonitorProcessor: vi.fn(),
}));
vi.mock("../workers/h49-einvoice-archive-download.js", () => ({
  einvoiceArchiveDownloadProcessor: vi.fn(),
}));
vi.mock("../workers/h50-einvoice-retry-failed.js", () => ({
  einvoiceRetryFailedProcessor: vi.fn(),
}));

vi.mock("../workers/i51-document-pdf-generate.js", () => ({
  documentPdfGenerateProcessor: vi.fn(),
}));
vi.mock("../workers/i52-document-email-send.js", () => ({
  documentEmailSendProcessor: vi.fn(),
}));
vi.mock("../workers/i53-document-whatsapp-send.js", () => ({
  documentWhatsappSendProcessor: vi.fn(),
}));
vi.mock("../workers/i54-document-template-compile.js", () => ({
  documentTemplateCompileProcessor: vi.fn(),
}));
vi.mock("../workers/i55-document-archive-store.js", () => ({
  documentArchiveStoreProcessor: vi.fn(),
}));

// J56-J60: Handover & Channel Routing Workers
vi.mock("../workers/j56-handover-detect.js", () => ({
  handoverDetectProcessor: vi.fn(),
}));
vi.mock("../workers/j57-handover-context-load.js", () => ({
  handoverContextLoadProcessor: vi.fn(),
}));
vi.mock("../workers/j58-channel-route-decide.js", () => ({
  channelRouteDecideProcessor: vi.fn(),
}));
vi.mock("../workers/j59-channel-whatsapp-send.js", () => ({
  channelWhatsappSendProcessor: vi.fn(),
}));
vi.mock("../workers/j60-channel-email-send.js", () => ({
  channelEmailSendProcessor: vi.fn(),
}));

// K61-K65: Sentiment & Intent Analysis Workers
vi.mock("../workers/k61-sentiment-analyze.js", () => ({
  sentimentAnalyzeProcessor: vi.fn(),
}));
vi.mock("../workers/k62-intent-classify.js", () => ({
  intentClassifyProcessor: vi.fn(),
}));
vi.mock("../workers/k63-objection-detect.js", () => ({
  objectionDetectProcessor: vi.fn(),
}));
vi.mock("../workers/k64-sentiment-trend-analyze.js", () => ({
  sentimentTrendAnalyzeProcessor: vi.fn(),
}));
vi.mock("../workers/k65-feedback-collect.js", () => ({
  feedbackCollectProcessor: vi.fn(),
}));

// L66-L70: MCP Server Workers
vi.mock("../workers/l66-mcp-resource-load.js", () => ({
  mcpResourceLoadProcessor: vi.fn(),
}));
vi.mock("../workers/l67-mcp-tool-register.js", () => ({
  mcpToolRegisterProcessor: vi.fn(),
}));
vi.mock("../workers/l68-mcp-session-manage.js", () => ({
  mcpSessionManageProcessor: vi.fn(),
}));
vi.mock("../workers/l69-mcp-health-check.js", () => ({
  mcpHealthCheckProcessor: vi.fn(),
}));
vi.mock("../workers/l70-mcp-metrics-collect.js", () => ({
  mcpMetricsCollectProcessor: vi.fn(),
}));
vi.mock("../workers/m71-guardrail-price-check.js", () => ({
  guardrailPriceCheckProcessor: vi.fn(),
}));
vi.mock("../workers/m72-guardrail-stock-check.js", () => ({
  guardrailStockCheckProcessor: vi.fn(),
}));
vi.mock("../workers/m73-guardrail-discount-check.js", () => ({
  guardrailDiscountCheckProcessor: vi.fn(),
}));
vi.mock("../workers/m74-guardrail-sku-validate.js", () => ({
  guardrailSkuValidateProcessor: vi.fn(),
}));
vi.mock("../workers/m75-guardrail-fiscal-validate.js", () => ({
  guardrailFiscalValidateProcessor: vi.fn(),
}));

vi.mock("../workers/n76-human-escalate.js", () => ({
  humanEscalateProcessor: vi.fn(),
}));
vi.mock("../workers/n77-human-takeover.js", () => ({
  humanTakeoverProcessor: vi.fn(),
}));
vi.mock("../workers/n78-human-approve.js", () => ({
  humanApproveProcessor: vi.fn(),
}));

vi.mock("../e3-metrics.js", () => ({
  aiTokensInput: { inc: vi.fn() },
  aiTokensOutput: { inc: vi.fn() },
  aiLlmLatencySeconds: { startTimer: vi.fn(() => vi.fn()), observe: vi.fn() },
  negotiationActive: { inc: vi.fn(), dec: vi.fn(), set: vi.fn() },
  fiscalInvoicesTotal: { inc: vi.fn() },
  einvoiceErrorsTotal: { inc: vi.fn() },
  einvoiceDeadlineRiskCount: { set: vi.fn() },
  mcpToolCallsTotal: { inc: vi.fn() },
  mcpSessionActive: { set: vi.fn() },
  stockReservationActive: { set: vi.fn() },
  llmRequestsTotal: { inc: vi.fn() },
  llmFallbackTotal: { inc: vi.fn() },
}));

vi.mock("@cerniq/worker-shared", () => ({
  createCircuitBreaker: vi.fn((fn: unknown) => ({ fire: fn })),
  createHealthServer: vi.fn(() => ({ close: vi.fn() })),
  createQueue: vi.fn(() => ({ add: vi.fn(), close: vi.fn() })),
  createRedisConnections: vi.fn(() => ({})),
  createWorker: vi.fn(() => ({
    worker: { on: vi.fn(), close: vi.fn() },
    observeDuration: vi.fn(),
  })),
  closeRedisConnections: vi.fn(),
  loadSecretsFromFile: vi.fn(),
  assertQueueRegistryComplete: vi.fn(),
  registerCognitiveWorkerEtapa: vi.fn(),
  queueRegistry: [],
  startQueueDepthMonitor: vi.fn(() => vi.fn()),
  watchSecretsFile: vi.fn(() => vi.fn()),
  withExternalApiMetrics: vi.fn((_, fn: () => unknown) => fn()),
  DEFAULT_JOB_OPTIONS: {},
  QUEUES: {},
  aiGuardrailBreachesTotal: { inc: vi.fn() },
  hitlTasksResolvedTotal: { inc: vi.fn() },
  hitlResolutionTimeSeconds: { observe: vi.fn() },
}));

// ── Importuri subiect ──────────────────────────────────────────────────────────
import { E3_QUEUE_PREFIXES, processors, assertE3ProcessorsOwnership } from "../main.js";

// ── Teste ─────────────────────────────────────────────────────────────────────

describe("assertE3ProcessorsOwnership()", () => {
  it("nu aruncă eroare când toți procesorii au prefix E3 valid", () => {
    expect(() => assertE3ProcessorsOwnership()).not.toThrow();
  });

  it("aruncă eroare când harta conține o coadă non-E3 (simulare regression job-stealing)", () => {
    const fakeProcessors = {
      ...processors,
      "enrich:anaf:fiscal-status": vi.fn(), // coadă E1 — nu aparține E3
    };
    expect(() => assertE3ProcessorsOwnership(fakeProcessors)).toThrow(
      /Non-E3 queue\(s\) found in processors map/,
    );
  });

  it("include în mesajul de eroare cozile invalide detectate", () => {
    // Alegem prefixe care NU sunt în E3_QUEUE_PREFIXES (enrich:, normalize:)
    const fakeProcessors = {
      ...processors,
      "enrich:anaf:fiscal-status": vi.fn(), // coadă E1 — prefix 'enrich:'
      "normalize:name": vi.fn(), // coadă E1 — prefix 'normalize:'
    };
    expect(() => assertE3ProcessorsOwnership(fakeProcessors)).toThrow(
      /enrich:anaf:fiscal-status.*normalize:name|normalize:name.*enrich:anaf:fiscal-status/,
    );
  });
});

describe("processors map (E3 AI Sales — integritate structurală)", () => {
  it("conține exact 78 de intrări (A1-A6, B7-B12, C13-C18, D19-D26, E27-E32, F33-F38, G39-G45, H46-H50, I51-I55, J56-J60, K61-K65, L66-L70, M71-M75, N76-N78)", () => {
    // 6+6+6+8+6+6+7+5+5+5+5+5+5+3 = 78
    expect(Object.keys(processors)).toHaveLength(78);
  });

  it("toate cheile încep cu un prefix E3 valid din E3_QUEUE_PREFIXES", () => {
    for (const queueName of Object.keys(processors)) {
      const hasValidPrefix = E3_QUEUE_PREFIXES.some((prefix) => queueName.startsWith(prefix));
      expect(hasValidPrefix, `"${queueName}" nu are prefix E3 valid`).toBe(true);
    }
  });

  it("nu conține chei duplicate", () => {
    const keys = Object.keys(processors);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("E3_QUEUE_PREFIXES acoperă toate prefixele utilizate în processors", () => {
    const usedPrefixes = new Set(
      Object.keys(processors).map((k) => {
        const colonIdx = k.indexOf(":");
        return colonIdx === -1 ? k : k.slice(0, colonIdx + 1);
      }),
    );
    for (const prefix of usedPrefixes) {
      const covered = E3_QUEUE_PREFIXES.some((p) => prefix.startsWith(p.replace(":", "")));
      expect(covered, `Prefix "${prefix}" nu este acoperit de E3_QUEUE_PREFIXES`).toBe(true);
    }
  });
});
