/**
 * E3 AI Sales — Metrici Prometheus specifice modulului.
 *
 * Prefix-uri:
 *   cerniq_ai_       — AI LLM + guardrails
 *   cerniq_negotiation_ — FSM negocieri
 *   cerniq_fiscal_   — facturare/proformă
 *   cerniq_einvoice_ — eFactura SPV
 *   cerniq_mcp_      — Model Context Protocol
 *   cerniq_llm_      — client LLM unificat
 *   cerniq_stock_    — rezervări stoc
 *
 * Documentație: plan §XI L8674-L8693, §XIII L2667-2674
 */
import { Counter, Gauge, Histogram } from "prom-client";
import { metricsRegistry } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// AI LLM metrici (plan L8679-L8684)
// ---------------------------------------------------------------------------

/** Tokeni LLM consumați la input (prompt), per model și tenant. */
export const aiTokensInput = new Counter({
  name: "cerniq_ai_tokens_input",
  help: "Total LLM input tokens consumed per model and tenant",
  labelNames: ["model", "tenant_id"] as const,
  registers: [metricsRegistry],
});

/** Tokeni LLM generați la output (completion), per model și tenant. */
export const aiTokensOutput = new Counter({
  name: "cerniq_ai_tokens_output",
  help: "Total LLM output tokens generated per model and tenant",
  labelNames: ["model", "tenant_id"] as const,
  registers: [metricsRegistry],
});

/**
 * Latență LLM per apel, per model și operație.
 * Buckete: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120] secunde (plan L8681).
 */
export const aiLlmLatencySeconds = new Histogram({
  name: "cerniq_ai_llm_latency_seconds",
  help: "LLM request latency in seconds per model and operation",
  labelNames: ["model", "operation"] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [metricsRegistry],
});

/**
 * Gauge — rata de trecere a guardrail-urilor per tenant.
 * Calculat extern: (PASS / total_checks) × 100.
 */
export const aiGuardrailPassRate = new Gauge({
  name: "cerniq_ai_guardrail_pass_rate",
  help: "Guardrail pass rate (percentage 0-100) per tenant",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

/**
 * Histogram — număr de tentative de regenerare AI după guardrail fail.
 * Buckete: [1, 2, 3] (max 3 tentative conform plan L1924).
 */
export const aiRegenerationAttempts = new Histogram({
  name: "cerniq_ai_regeneration_attempts",
  help: "Number of AI response regeneration attempts after guardrail failure",
  labelNames: ["guardrail_type"] as const,
  buckets: [1, 2, 3],
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// Negocieri metrici (plan L8685-L8686)
// ---------------------------------------------------------------------------

/**
 * Gauge — negocieri active per stare FSM și tenant.
 * Echivalent prom-client al UpDownCounter (plan L8685).
 */
export const negotiationActive = new Gauge({
  name: "cerniq_negotiation_active",
  help: "Active negotiations count per FSM state and tenant",
  labelNames: ["tenant_id", "state"] as const,
  registers: [metricsRegistry],
});

/** Histogram — distribuție discount mediu per negociere și tenant. */
export const negotiationDiscountAvg = new Histogram({
  name: "cerniq_negotiation_discount_avg",
  help: "Average discount percentage distribution per negotiation",
  labelNames: ["tenant_id"] as const,
  buckets: [0, 5, 10, 15, 20, 25, 30, 40, 50],
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// Fiscal metrici (plan L8687-L8690)
// ---------------------------------------------------------------------------

/** Counter — facturi/proformi emise per tip document și tenant. */
export const fiscalInvoicesTotal = new Counter({
  name: "cerniq_fiscal_invoices_total",
  help: "Total fiscal documents issued per type (INVOICE, PROFORMA, CREDIT_NOTE)",
  labelNames: ["tenant_id", "doc_type"] as const,
  registers: [metricsRegistry],
});

/** Counter — erori eFactura SPV ANAF per tip eroare și tenant. */
export const einvoiceErrorsTotal = new Counter({
  name: "cerniq_einvoice_errors_total",
  help: "Total eInvoice ANAF SPV errors per error type",
  labelNames: ["error_type", "tenant_id"] as const,
  registers: [metricsRegistry],
});

/**
 * Gauge — rata de conversie fiscal (negocieri→facturi) per tenant.
 * Actualizat de G39/G41 după emitere factură.
 */
export const fiscalConversionRate = new Gauge({
  name: "cerniq_fiscal_conversion_rate",
  help: "Fiscal conversion rate (negotiations to invoices ratio) per tenant",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

/**
 * Gauge — număr facturi cu risc de depășire deadline 5 zile (amenda 15-20%).
 * Actualizat de H48 einvoice:deadline:monitor CRON zilnic (plan L1980).
 */
export const einvoiceDeadlineRiskCount = new Gauge({
  name: "cerniq_einvoice_deadline_risk_count",
  help: "Number of eInvoices at risk of missing the 5-day submission deadline",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// MCP metrici (plan L8691-L8692)
// ---------------------------------------------------------------------------

/** Counter — apeluri MCP tools per tool name și status (success/error). */
export const mcpToolCallsTotal = new Counter({
  name: "cerniq_mcp_tool_calls_total",
  help: "Total MCP tool calls per tool name and status",
  labelNames: ["tool_name", "status"] as const,
  registers: [metricsRegistry],
});

/** Gauge — sesiuni MCP active în prezent per tenant. */
export const mcpSessionActive = new Gauge({
  name: "cerniq_mcp_session_active",
  help: "Currently active MCP sessions per tenant",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// Stock metrici (plan L8693)
// ---------------------------------------------------------------------------

/** Gauge — rezervări de stoc active (oferte în curs) per tenant. */
export const stockReservationActive = new Gauge({
  name: "cerniq_stock_reservation_active",
  help: "Active stock reservations (open negotiation offers) per tenant",
  labelNames: ["tenant_id"] as const,
  registers: [metricsRegistry],
});

/** Apeluri `product:embed` respinse: vector MRL ≠ 3072 (nu trebuie să apară dacă `embedText` e singura sursă). */
export const e3EmbeddingDimensionRejectTotal = new Counter({
  name: "cerniq_e3_embedding_dimension_reject_total",
  help: "E3 product/chunk embed rejected: embedding length or dimensions not 3072 (halfvec MRL)",
  labelNames: ["surface"] as const,
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// LLM client unificat — sursa unică: @cerniq/worker-shared (metrics.ts + llm-client)
// ---------------------------------------------------------------------------

export {
  llmCostUsdTotal,
  llmFallbackTotal,
  llmLatencySeconds,
  llmRequestsTotal,
  llmTokensTotal,
  recordLlmCostUsd,
  recordLlmFallback,
} from "@cerniq/worker-shared";
