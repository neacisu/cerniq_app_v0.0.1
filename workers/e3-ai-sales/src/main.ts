/**
 * E3 AI Sales Worker — main process.
 *
 * Procesează cozi E3:
 *   A1-A6  — Product Knowledge  (product:*)
 *   B7-B12 — Hybrid Search      (search:*)
 *   C13-C18 — AI Agent Core     (ai:*)
 *   D19-D26 — Negotiation FSM   (negotiation:*)
 *   E27-E32 — Pricing/Discount  (pricing:*)
 *   F33-F38 — Stock & Inventory (stock:*)
 *   G39-G45 — Oblio Invoicing    (oblio:*)
 *   H46-H50 — eFactura SPV       (einvoice:*)
 *   I51-I55 — Document Generation (document:*)
 *   J56-J60 — Handover & Channel Routing (handover:*, channel:*)
 *   K61-K65 — Sentiment & Intent Analysis (sentiment:*, intent:*, objection:*, feedback:*)
 *   L66-L70 — MCP Server (mcp:*)
 *   M71-M75 — Guardrails Zero Hallucination (guardrail:*)
 *   N76-N78 — HITL Human-In-The-Loop (human:*)
 *
 * Pattern: createWorker din factory.ts (@cerniq/worker-shared).
 */
import type { Job } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import {
  assertQueueRegistryComplete,
  createHealthServer,
  createWorker,
  loadSecretsFromFile,
  queueRegistry,
  startQueueDepthMonitor,
  watchSecretsFile,
  closeRedisConnections,
  createRedisConnections,
} from "@cerniq/worker-shared";

// A1-A6: Product Knowledge Workers
import { productIngestProcessor } from "./workers/a1-product-ingest.js";
import { productEmbedProcessor } from "./workers/a2-product-embed.js";
import { productChunkProcessor } from "./workers/a3-product-chunk.js";
import { productIndexRebuildProcessor } from "./workers/a4-product-index-rebuild.js";
import { productCategorySyncProcessor } from "./workers/a5-product-category-sync.js";
import { productVariantProcessProcessor } from "./workers/a6-product-variant-process.js";

// B7-B12: Hybrid Search Workers
import { searchQueryRewriteProcessor } from "./workers/b7-search-query-rewrite.js";
import { searchVectorExecuteProcessor } from "./workers/b8-search-vector-execute.js";
import { searchBm25ExecuteProcessor } from "./workers/b9-search-bm25-execute.js";
import { searchRrfFuseProcessor } from "./workers/b10-search-rrf-fuse.js";
import { searchFilterApplyProcessor } from "./workers/b11-search-filter-apply.js";
import { searchCacheManageProcessor } from "./workers/b12-search-cache-manage.js";

// C13-C18: AI Agent Core Workers
import { aiContextBuildProcessor } from "./workers/c13-ai-context-build.js";
import { aiAgentOrchestrateProcessor } from "./workers/c14-ai-agent-orchestrate.js";
import { aiResponseGenerateProcessor } from "./workers/c15-ai-response-generate.js";
import { aiResponseValidateProcessor } from "./workers/c16-ai-response-validate.js";
import { aiConversationStoreProcessor } from "./workers/c17-ai-conversation-store.js";
import { aiRetryRegenerateProcessor } from "./workers/c18-ai-retry-regenerate.js";

// D19-D26: Negotiation FSM Workers
import { negotiationStateTransitionProcessor } from "./workers/d19-negotiation-state-transition.js";
import { negotiationHistoryLogProcessor } from "./workers/d20-negotiation-history-log.js";
import { negotiationItemsUpdateProcessor } from "./workers/d21-negotiation-items-update.js";
import { negotiationReminderSendProcessor } from "./workers/d22-negotiation-reminder-send.js";
import { negotiationExpireCheckProcessor } from "./workers/d23-negotiation-expire-check.js";
import { negotiationCloseExecuteProcessor } from "./workers/d24-negotiation-close-execute.js";
import { negotiationReopenRequestProcessor } from "./workers/d25-negotiation-reopen-request.js";
import { negotiationAbandonProcessProcessor } from "./workers/d26-negotiation-abandon-process.js";

// E27-E32: Pricing / Discount Workers
import { pricingDiscountCalculateProcessor } from "./workers/e27-pricing-discount-calculate.js";
import { pricingDiscountApplyProcessor } from "./workers/e28-pricing-discount-apply.js";
import { pricingDiscountApproveProcessor } from "./workers/e29-pricing-discount-approve.js";
import { pricingMarginCheckProcessor } from "./workers/e30-pricing-margin-check.js";
import { pricingVolumeCalculateProcessor } from "./workers/e31-pricing-volume-calculate.js";
import { pricingCompetitorCheckProcessor } from "./workers/e32-pricing-competitor-check.js";

// F33-F38: Stock & Inventory Workers
import { stockRealtimeCheckProcessor } from "./workers/f33-stock-realtime-check.js";
import { stockReserveCreateProcessor } from "./workers/f34-stock-reserve-create.js";
import { stockReserveReleaseProcessor } from "./workers/f35-stock-reserve-release.js";
import { stockSyncErpProcessor } from "./workers/f36-stock-sync-erp.js";
import { stockLowAlertProcessor } from "./workers/f37-stock-low-alert.js";
import { stockReplenishRequestProcessor } from "./workers/f38-stock-replenish-request.js";

// G39-G45: Oblio Invoicing Workers
import { oblioProformaCreateProcessor } from "./workers/g39-oblio-proforma-create.js";
import { oblioProformaUpdateProcessor } from "./workers/g40-oblio-proforma-update.js";
import { oblioInvoiceCreateProcessor } from "./workers/g41-oblio-invoice-create.js";
import { oblioInvoiceCancelProcessor } from "./workers/g42-oblio-invoice-cancel.js";
import { oblioClientValidateProcessor } from "./workers/g43-oblio-client-validate.js";
import { oblioStockSyncProcessor } from "./workers/g44-oblio-stock-sync.js";
import { oblioWebhookProcessProcessor } from "./workers/g45-oblio-webhook-process.js";

// H46-H50: eFactura SPV via Oblio Workers
import { einvoiceSendProcessor } from "./workers/h46-einvoice-send.js";
import { einvoiceStatusCheckProcessor } from "./workers/h47-einvoice-status-check.js";
import { einvoiceDeadlineMonitorProcessor } from "./workers/h48-einvoice-deadline-monitor.js";
import { einvoiceArchiveDownloadProcessor } from "./workers/h49-einvoice-archive-download.js";
import { einvoiceRetryFailedProcessor } from "./workers/h50-einvoice-retry-failed.js";

// I51-I55: Document Generation Workers
import { documentPdfGenerateProcessor } from "./workers/i51-document-pdf-generate.js";
import { documentEmailSendProcessor } from "./workers/i52-document-email-send.js";
import { documentWhatsappSendProcessor } from "./workers/i53-document-whatsapp-send.js";
import { documentTemplateCompileProcessor } from "./workers/i54-document-template-compile.js";
import { documentArchiveStoreProcessor } from "./workers/i55-document-archive-store.js";

// J56-J60: Handover & Channel Routing Workers
import { handoverDetectProcessor } from "./workers/j56-handover-detect.js";
import { handoverContextLoadProcessor } from "./workers/j57-handover-context-load.js";
import { channelRouteDecideProcessor } from "./workers/j58-channel-route-decide.js";
import { channelWhatsappSendProcessor } from "./workers/j59-channel-whatsapp-send.js";
import { channelEmailSendProcessor } from "./workers/j60-channel-email-send.js";

// K61-K65: Sentiment & Intent Analysis Workers
import { sentimentAnalyzeProcessor } from "./workers/k61-sentiment-analyze.js";
import { intentClassifyProcessor } from "./workers/k62-intent-classify.js";
import { objectionDetectProcessor } from "./workers/k63-objection-detect.js";
import { sentimentTrendAnalyzeProcessor } from "./workers/k64-sentiment-trend-analyze.js";
import { feedbackCollectProcessor } from "./workers/k65-feedback-collect.js";

// L66-L70: MCP Server Workers
import { mcpResourceLoadProcessor } from "./workers/l66-mcp-resource-load.js";
import { mcpToolRegisterProcessor } from "./workers/l67-mcp-tool-register.js";
import { mcpSessionManageProcessor } from "./workers/l68-mcp-session-manage.js";
import { mcpHealthCheckProcessor } from "./workers/l69-mcp-health-check.js";
import { mcpMetricsCollectProcessor } from "./workers/l70-mcp-metrics-collect.js";

// M71-M75: Guardrails Zero Hallucination Workers
import { guardrailPriceCheckProcessor } from "./workers/m71-guardrail-price-check.js";
import { guardrailStockCheckProcessor } from "./workers/m72-guardrail-stock-check.js";
import { guardrailDiscountCheckProcessor } from "./workers/m73-guardrail-discount-check.js";
import { guardrailSkuValidateProcessor } from "./workers/m74-guardrail-sku-validate.js";
import { guardrailFiscalValidateProcessor } from "./workers/m75-guardrail-fiscal-validate.js";

// N76-N78: HITL Human-In-The-Loop Workers
import { humanEscalateProcessor } from "./workers/n76-human-escalate.js";
import { humanTakeoverProcessor } from "./workers/n77-human-takeover.js";
import { humanApproveProcessor } from "./workers/n78-human-approve.js";

const svcLog = createServiceLogger("e3-ai-sales");

const PORT = Number(process.env.PORT ?? "3002");
const SECRETS_PATH = process.env.SECRETS_PATH?.trim() ?? "/secrets/workers.env";

export const E3_QUEUE_PREFIXES = [
  "product:",
  "search:",
  "ai:",
  "negotiation:",
  "pricing:",
  "stock:",
  "oblio:",
  "einvoice:",
  "document:",
  "handover:",
  "channel:",
  "sentiment:",
  "intent:",
  "objection:",
  "feedback:",
  "mcp:",
  "guardrail:",
  "human:",
] as const;

export const processors: Record<string, (job: Job) => Promise<unknown>> = {
  // A — Product Knowledge
  "product:ingest": productIngestProcessor as (job: Job) => Promise<unknown>,
  "product:embed": productEmbedProcessor as (job: Job) => Promise<unknown>,
  "product:chunk": productChunkProcessor as (job: Job) => Promise<unknown>,
  "product:index:rebuild": productIndexRebuildProcessor as (job: Job) => Promise<unknown>,
  "product:category:sync": productCategorySyncProcessor as (job: Job) => Promise<unknown>,
  "product:variant:process": productVariantProcessProcessor as (job: Job) => Promise<unknown>,
  // B — Hybrid Search
  "search:query:rewrite": searchQueryRewriteProcessor as (job: Job) => Promise<unknown>,
  "search:vector:execute": searchVectorExecuteProcessor as (job: Job) => Promise<unknown>,
  "search:bm25:execute": searchBm25ExecuteProcessor as (job: Job) => Promise<unknown>,
  "search:rrf:fuse": searchRrfFuseProcessor as (job: Job) => Promise<unknown>,
  "search:filter:apply": searchFilterApplyProcessor as (job: Job) => Promise<unknown>,
  "search:cache:manage": searchCacheManageProcessor as (job: Job) => Promise<unknown>,
  // C — AI Agent Core
  "ai:context:build": aiContextBuildProcessor as (job: Job) => Promise<unknown>,
  "ai:agent:orchestrate": aiAgentOrchestrateProcessor as (job: Job) => Promise<unknown>,
  "ai:e3:response:generate": aiResponseGenerateProcessor as (job: Job) => Promise<unknown>,
  "ai:response:validate": aiResponseValidateProcessor as (job: Job) => Promise<unknown>,
  "ai:conversation:store": aiConversationStoreProcessor as (job: Job) => Promise<unknown>,
  "ai:retry:regenerate": aiRetryRegenerateProcessor as (job: Job) => Promise<unknown>,
  // D — Negotiation FSM
  "negotiation:state:transition": negotiationStateTransitionProcessor as (
    job: Job,
  ) => Promise<unknown>,
  "negotiation:history:log": negotiationHistoryLogProcessor as (job: Job) => Promise<unknown>,
  "negotiation:items:update": negotiationItemsUpdateProcessor as (job: Job) => Promise<unknown>,
  "negotiation:reminder:send": negotiationReminderSendProcessor as (job: Job) => Promise<unknown>,
  "negotiation:expire:check": negotiationExpireCheckProcessor as (job: Job) => Promise<unknown>,
  "negotiation:close:execute": negotiationCloseExecuteProcessor as (job: Job) => Promise<unknown>,
  "negotiation:reopen:request": negotiationReopenRequestProcessor as (job: Job) => Promise<unknown>,
  "negotiation:abandon:process": negotiationAbandonProcessProcessor as (
    job: Job,
  ) => Promise<unknown>,
  // E — Pricing / Discount
  "pricing:discount:calculate": pricingDiscountCalculateProcessor as (job: Job) => Promise<unknown>,
  "pricing:discount:apply": pricingDiscountApplyProcessor as (job: Job) => Promise<unknown>,
  "pricing:discount:approve": pricingDiscountApproveProcessor as (job: Job) => Promise<unknown>,
  "pricing:margin:check": pricingMarginCheckProcessor as (job: Job) => Promise<unknown>,
  "pricing:volume:calculate": pricingVolumeCalculateProcessor as (job: Job) => Promise<unknown>,
  "pricing:competitor:check": pricingCompetitorCheckProcessor as (job: Job) => Promise<unknown>,
  // F — Stock & Inventory
  "stock:realtime:check": stockRealtimeCheckProcessor as (job: Job) => Promise<unknown>,
  "stock:reserve:create": stockReserveCreateProcessor as (job: Job) => Promise<unknown>,
  "stock:reserve:release": stockReserveReleaseProcessor as (job: Job) => Promise<unknown>,
  "stock:sync:erp": stockSyncErpProcessor as (job: Job) => Promise<unknown>,
  "stock:low:alert": stockLowAlertProcessor as (job: Job) => Promise<unknown>,
  "stock:replenish:request": stockReplenishRequestProcessor as (job: Job) => Promise<unknown>,
  // G — Oblio Invoicing
  "oblio:proforma:create": oblioProformaCreateProcessor as (job: Job) => Promise<unknown>,
  "oblio:proforma:update": oblioProformaUpdateProcessor as (job: Job) => Promise<unknown>,
  "oblio:invoice:create": oblioInvoiceCreateProcessor as (job: Job) => Promise<unknown>,
  "oblio:invoice:cancel": oblioInvoiceCancelProcessor as (job: Job) => Promise<unknown>,
  "oblio:client:validate": oblioClientValidateProcessor as (job: Job) => Promise<unknown>,
  "oblio:stock:sync": oblioStockSyncProcessor as (job: Job) => Promise<unknown>,
  "oblio:webhook:process": oblioWebhookProcessProcessor as (job: Job) => Promise<unknown>,
  // H — eFactura SPV via Oblio
  "einvoice:send": einvoiceSendProcessor as (job: Job) => Promise<unknown>,
  "einvoice:status:check": einvoiceStatusCheckProcessor as (job: Job) => Promise<unknown>,
  "einvoice:deadline:monitor": einvoiceDeadlineMonitorProcessor as (job: Job) => Promise<unknown>,
  "einvoice:archive:download": einvoiceArchiveDownloadProcessor as (job: Job) => Promise<unknown>,
  "einvoice:retry:failed": einvoiceRetryFailedProcessor as (job: Job) => Promise<unknown>,
  // I — Document Generation
  "document:pdf:generate": documentPdfGenerateProcessor as (job: Job) => Promise<unknown>,
  "document:email:send": documentEmailSendProcessor as (job: Job) => Promise<unknown>,
  "document:whatsapp:send": documentWhatsappSendProcessor as (job: Job) => Promise<unknown>,
  "document:template:compile": documentTemplateCompileProcessor as (job: Job) => Promise<unknown>,
  "document:archive:store": documentArchiveStoreProcessor as (job: Job) => Promise<unknown>,

  // J — Handover & Channel Routing
  "handover:detect": handoverDetectProcessor as (job: Job) => Promise<unknown>,
  "handover:context:load": handoverContextLoadProcessor as (job: Job) => Promise<unknown>,
  "channel:route:decide": channelRouteDecideProcessor as (job: Job) => Promise<unknown>,
  "channel:whatsapp:send": channelWhatsappSendProcessor as (job: Job) => Promise<unknown>,
  "channel:email:send": channelEmailSendProcessor as (job: Job) => Promise<unknown>,

  // K — Sentiment & Intent Analysis
  "sentiment:analyze": sentimentAnalyzeProcessor as (job: Job) => Promise<unknown>,
  "intent:classify": intentClassifyProcessor as (job: Job) => Promise<unknown>,
  "objection:detect": objectionDetectProcessor as (job: Job) => Promise<unknown>,
  "sentiment:trend:analyze": sentimentTrendAnalyzeProcessor as (job: Job) => Promise<unknown>,
  "feedback:collect": feedbackCollectProcessor as (job: Job) => Promise<unknown>,

  // L — MCP Server
  "mcp:resource:load": mcpResourceLoadProcessor as (job: Job) => Promise<unknown>,
  "mcp:tool:register": mcpToolRegisterProcessor as (job: Job) => Promise<unknown>,
  "mcp:session:manage": mcpSessionManageProcessor as (job: Job) => Promise<unknown>,
  "mcp:health:check": mcpHealthCheckProcessor as (job: Job) => Promise<unknown>,
  "mcp:metrics:collect": mcpMetricsCollectProcessor as (job: Job) => Promise<unknown>,

  // M — Guardrails Zero Hallucination (CRITICAL, DETERMINISTIC)
  "guardrail:price:check": guardrailPriceCheckProcessor as (job: Job) => Promise<unknown>,
  "guardrail:stock:check": guardrailStockCheckProcessor as (job: Job) => Promise<unknown>,
  "guardrail:discount:check": guardrailDiscountCheckProcessor as (job: Job) => Promise<unknown>,
  "guardrail:sku:validate": guardrailSkuValidateProcessor as (job: Job) => Promise<unknown>,
  "guardrail:fiscal:validate": guardrailFiscalValidateProcessor as (job: Job) => Promise<unknown>,

  // N — HITL Human-In-The-Loop E3 (SLA 4h, plan L1604)
  "human:escalate": humanEscalateProcessor as (job: Job) => Promise<unknown>,
  "human:takeover": humanTakeoverProcessor as (job: Job) => Promise<unknown>,
  "human:approve": humanApproveProcessor as (job: Job) => Promise<unknown>,
};

/**
 * Valideaza ca toti procesorii din map-ul E3 apartin exclusiv spatiului de cozi E3.
 * Protejeaza impotriva regresiilor de tip job-stealing: daca o coada non-E3 apare in
 * harta de procesori (e.g. enrich:*, ai:structure:*, ai:sentiment:*), workerul
 * ar accepta tacit jobul si ar returna { ok: true, status: "no-processor" }.
 *
 * Accepta un map optional pentru testabilitate (implicit: modulul global `processors`).
 */
export function assertE3ProcessorsOwnership(
  processorMap: Readonly<typeof processors> = processors,
): void {
  const invalidQueues = Object.keys(processorMap).filter(
    (queueName) => !E3_QUEUE_PREFIXES.some((prefix) => queueName.startsWith(prefix)),
  );
  if (invalidQueues.length > 0) {
    throw new Error(
      `[e3-ai-sales] Non-E3 queue(s) found in processors map — possible job-stealing regression: ${invalidQueues.join(", ")}`,
    );
  }
}

const stats = {
  processed: 0,
  failed: 0,
  lastJob: null as null | { name: string; id: string; queue: string; timestamp: string },
};

let redisConnections = createRedisConnections();
let workers: Array<ReturnType<typeof createWorker>["worker"]> = [];
let activeE3QueueNames: string[] = [];

function buildWorkers(queueNames: string[]): void {
  const queueConfigs = new Map(queueRegistry.map((q) => [q.name, q]));

  workers = queueNames.map((queueName) => {
    const queueConfig = queueConfigs.get(queueName);
    const { worker, observeDuration } = createWorker(
      queueName,
      async (job: Job) => {
        const startedAt = Date.now();
        try {
          const processor = processors[queueName];
          if (!processor) {
            return { ok: true, status: "no-processor" };
          }
          const result = await processor(job);
          stats.processed += 1;
          stats.lastJob = {
            name: job.name,
            id: String(job.id),
            queue: queueName,
            timestamp: new Date().toISOString(),
          };
          return result;
        } catch (error) {
          stats.failed += 1;
          throw error;
        } finally {
          observeDuration(startedAt);
        }
      },
      {
        concurrency: queueConfig?.concurrency ?? 5,
        limiter: queueConfig?.rateLimit,
      },
    );

    worker.on("error", (err: Error) => {
      svcLog.error(
        { queue: queueName, err, ...enrichError(err, { scope: "worker:error" }) },
        "e3 worker error",
      );
    });
    worker.on("stalled", (jobId: string) => {
      svcLog.warn({ queue: queueName, jobId }, "e3 worker stalled");
    });

    return worker;
  });
}

async function stopWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  workers = [];
}

async function reloadSecretsAndConnections(): Promise<void> {
  loadSecretsFromFile(true, SECRETS_PATH);
  await stopWorkers();
  await closeRedisConnections(redisConnections);
  redisConnections = createRedisConnections();
  buildWorkers(activeE3QueueNames);
}

export async function bootstrap(): Promise<void> {
  loadSecretsFromFile(false, SECRETS_PATH);
  assertE3ProcessorsOwnership();
  assertQueueRegistryComplete();

  // BUG-FIX: use processors map as the authoritative source of truth for queue subscription.
  // The previous prefix-based filter (E3_QUEUE_PREFIXES) also matched E1 queues
  // (ai:structure:xai, ai:merge:xai, ai:score:confidence, ai:fallback) and E2 queues
  // (ai:sentiment:analyze) — causing silent job-stealing because processors[queueName]
  // would be undefined and the worker returned { ok: true, status: "no-processor" }
  // without actually processing the job.
  activeE3QueueNames = Array.from(new Set(queueRegistry.map((q) => q.name))).filter((n) =>
    Object.hasOwn(processors, n),
  );

  buildWorkers(activeE3QueueNames);

  const stopQueueMonitor = startQueueDepthMonitor({
    queueNames: activeE3QueueNames,
    dlqNames: [],
  });

  const server = createHealthServer(PORT, () => ({
    service: "cerniq-worker-e3-ai-sales",
    status: "running",
    queues: activeE3QueueNames,
    workerCount: workers.length,
    ...stats,
    timestamp: new Date().toISOString(),
  }));

  const stopWatchingSecrets = watchSecretsFile(SECRETS_PATH, async () => {
    await reloadSecretsAndConnections();
  });

  async function shutdown(): Promise<void> {
    stopWatchingSecrets();
    await stopQueueMonitor();
    server.close();
    await stopWorkers();
    await closeRedisConnections(redisConnections);
    process.exit(0);
  }

  process.on("SIGHUP", () => {
    reloadSecretsAndConnections().catch((reason) => {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      svcLog.error({ reason, ...enrichError(err, { scope: "SIGHUP" }) }, "SIGHUP reload failed");
    });
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    svcLog.error(
      { reason, ...enrichError(err, { scope: "unhandledRejection" }) },
      "unhandledRejection",
    );
  });
  process.on("uncaughtException", (error) => {
    svcLog.error(
      { err: error, ...enrichError(error, { scope: "uncaughtException" }) },
      "uncaughtException",
    );
  });

  svcLog.info(
    { port: PORT, queueCount: activeE3QueueNames.length, queues: activeE3QueueNames },
    "e3-ai-sales started",
  );
}
