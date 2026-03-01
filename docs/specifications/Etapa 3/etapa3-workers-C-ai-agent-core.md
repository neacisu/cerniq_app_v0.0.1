# Etapa 3 - Workers Categoria C: AI Agent Core

## Cerniq.app - AI Sales Agent Neuro-Simbolic

**Versiune Document:** 2.0  
**Data:** 01 Februarie 2026  
**Categorie Workers:** C - AI Agent Core (4 workeri)  
**Referință:** `cerniq-workers-etapa3-ai-sales-agent.md` secțiunea 6  
**Sprint Plan:** E3.S3.PR9, E3.S3.PR10, E3.S3.PR11, E3.S3.PR12 (vezi [etapa3-sprint-plan.md](etapa3-sprint-plan.md))  
**Phase:** F3.4 AI Orchestration

---

## Cuprins

1. [Prezentare Generală Categoria C](#1-prezentare-generală-categoria-c)
2. [Worker #9: ai:agent:orchestrate](#2-worker-9-aiagentorchestrate)
3. [Worker #10: ai:agent:response-generate](#3-worker-10-aiagentresponse-generate)
4. [Worker #11: ai:tool:execute](#4-worker-11-aitoolexecute)
5. [Worker #12: ai:context:build](#5-worker-12-aicontextbuild)
6. [Fluxul de Orchestrare AI Agent](#6-fluxul-de-orchestrare-ai-agent)
7. [Sistem de Regenerare cu Guardrails](#7-sistem-de-regenerare-cu-guardrails)
8. [Configurare și Inițializare](#8-configurare-și-inițializare)
9. [Integrare cu MCP Server](#9-integrare-cu-mcp-server)
10. [Monitorizare și Observabilitate](#10-monitorizare-și-observabilitate)

---

## 1. Prezentare Generală Categoria C

### 1.1 Responsabilitate

Categoria C conține **nucleul AI Agent** - workerii responsabili pentru:

- Orchestrarea întregului flux conversațional
- Generarea răspunsurilor cu LLM (xAI Grok-4)
- Execuția tool calls MCP
- Construirea contextului pentru prompt engineering

### 1.2 Paradigma Neuro-Simbolică în Practică

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AI AGENT CORE - NEURO-SYMBOLIC LOOP                      │
│                                                                             │
│   ┌───────────────┐     ┌───────────────┐     ┌───────────────┐            │
│   │   NEURAL      │     │   SYMBOLIC    │     │   OUTPUT      │            │
│   │  (LLM Grok)   │────▶│  (Guardrails) │────▶│  (Response)   │            │
│   │               │     │               │     │               │            │
│   │ • Generate    │     │ • Validate    │     │ • Send to     │            │
│   │   response    │     │   price       │     │   customer    │            │
│   │ • Call tools  │     │ • Check stock │     │ • Update      │            │
│   │ • Reason      │     │ • Verify      │     │   state       │            │
│   └───────────────┘     └───────────────┘     └───────────────┘            │
│          ▲                     │                                            │
│          │                     │ FAIL                                       │
│          └─────────────────────┘                                            │
│              Regenerate with feedback                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Inventar Workeri Categoria C

| #   | Worker                       | Queue                      | Concurrency | Timeout | Responsabilitate          |
| --- | ---------------------------- | -------------------------- | ----------- | ------- | ------------------------- |
| 9   | `ai:agent:orchestrate`       | ai:agent:orchestrate       | 50          | 120s    | Orchestrator principal    |
| 10  | `ai:agent:response-generate` | ai:agent:response-generate | 100         | 30s     | Generare răspuns text     |
| 11  | `ai:tool:execute`            | ai:tool:execute            | 200         | 30s     | Execuție tool MCP         |
| 12  | `ai:context:build`           | ai:context:build           | 100         | 10s     | Construire context prompt |

### 1.4 Dependențe Externe

| Serviciu          | Scop              | Rate Limit   | Fallback     |
| ----------------- | ----------------- | ------------ | ------------ |
| **xAI Grok-4**    | LLM principal     | 1000 req/min | Queue retry  |
| **MCP Server**    | Tools & Resources | Intern       | Cache        |
| **PostgreSQL 18** | State & History   | N/A          | Replica read |
| **Redis 8.4.0**   | Cache & Sessions  | N/A          | N/A          |

---

## 2. Worker #9: etapa3:ai:agent:orchestrate

### 2.1 Specificații

| Atribut               | Valoare                            |
| --------------------- | ---------------------------------- |
| **Queue Name**        | `etapa3:ai:agent:orchestrate`      |
| **Concurrency**       | 50                                 |
| **Timeout**           | 120000ms (2 min pentru tool loops) |
| **Rate Limit**        | N/A (controlat de LLM rate)        |
| **Retry Strategy**    | 3 attempts, exponential backoff    |
| **Dead Letter Queue** | `etapa3:ai:agent:orchestrate:dlq`  |

### 2.2 Job Data Schema

```typescript
// /packages/shared/src/schemas/ai-agent.schemas.ts

import { z } from "zod";

export const AgentOrchestrateJobDataSchema = z.object({
  correlationId: z.string().uuid(),
  shopId: z.string().uuid(),
  leadId: z.string().uuid(),
  negotiationId: z.string().uuid(),
  message: z.object({
    content: z.string().min(1).max(10000),
    channel: z.enum(["WHATSAPP", "EMAIL"]),
    externalMessageId: z.string(),
    attachments: z
      .array(
        z.object({
          type: z.enum(["image", "document", "audio"]),
          url: z.string().url(),
          mimeType: z.string().optional(),
          size: z.number().optional(),
        }),
      )
      .optional(),
    timestamp: z.string().datetime(),
  }),
  context: z.object({
    conversationHistory: z.array(
      z.object({
        role: z.enum(["user", "assistant", "system", "tool"]),
        content: z.string(),
        timestamp: z.string().datetime().optional(),
        toolCallId: z.string().optional(),
      }),
    ),
    currentState: z.enum([
      "DISCOVERY",
      "PROPOSAL",
      "NEGOTIATION",
      "CLOSING",
      "PROFORMA_SENT",
      "PROFORMA_ACCEPTED",
      "INVOICED",
      "EINVOICE_PENDING",
      "EINVOICE_SENT",
      "PAID",
      "COMPLETED",
      "DEAD",
      "ON_HOLD",
    ]),
    cartItems: z.array(
      z.object({
        sku: z.string(),
        productId: z.string().uuid(),
        title: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
        discountPercent: z.number().min(0).max(100).optional(),
        totalPrice: z.number().positive(),
      }),
    ),
    clientData: z
      .object({
        cif: z.string().optional(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z
          .object({
            street: z.string().optional(),
            city: z.string().optional(),
            county: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().default("RO"),
          })
          .optional(),
        isVerified: z.boolean().default(false),
      })
      .optional(),
    shopName: z.string(),
    shopConfig: z.object({
      currency: z.string().default("RON"),
      language: z.string().default("ro"),
      allowedDiscountMax: z.number().min(0).max(100),
      requireApprovalAbove: z.number().positive().optional(),
    }),
  }),
  options: z
    .object({
      maxRegenerationAttempts: z.number().min(1).max(5).default(3),
      responseMaxTokens: z.number().min(100).max(2000).default(500),
      temperature: z.number().min(0).max(1).default(0.7),
      forceHumanReview: z.boolean().default(false),
    })
    .optional(),
});

export type AgentOrchestrateJobData = z.infer<
  typeof AgentOrchestrateJobDataSchema
>;
```

### 2.3 Result Schema

```typescript
// /packages/shared/src/schemas/ai-agent.schemas.ts

export const AgentOrchestrateResultSchema = z.object({
  responseContent: z.string(),
  toolsCalled: z.array(
    z.object({
      name: z.string(),
      arguments: z.record(z.any()),
      result: z.any(),
      durationMs: z.number(),
      cached: z.boolean().default(false),
      error: z
        .object({
          code: z.string(),
          message: z.string(),
          retryable: z.boolean(),
        })
        .optional(),
    }),
  ),
  guardrailChecks: z.array(
    z.object({
      type: z.enum([
        "PRICE_VALIDATION",
        "STOCK_VALIDATION",
        "DISCOUNT_VALIDATION",
        "SKU_VALIDATION",
        "FISCAL_DATA_VALIDATION",
        "CONTENT_MODERATION",
      ]),
      passed: z.boolean(),
      details: z.any(),
      correctionMessage: z.string().optional(),
    }),
  ),
  stateTransition: z
    .object({
      from: z.string(),
      to: z.string(),
      reason: z.string(),
      triggeredBy: z.enum([
        "AI_DECISION",
        "TOOL_RESULT",
        "USER_ACTION",
        "TIMEOUT",
      ]),
    })
    .optional(),
  suggestedActions: z.array(z.string()),
  tokensUsed: z.object({
    prompt: z.number(),
    completion: z.number(),
    total: z.number(),
    estimatedCost: z.number(), // USD
  }),
  regenerationAttempts: z.number(),
  requiresHumanReview: z.boolean(),
  humanReviewReason: z.string().optional(),
  humanReviewPriority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  processingTimeMs: z.number(),
  modelUsed: z.string(),
});

export type AgentOrchestrateResult = z.infer<
  typeof AgentOrchestrateResultSchema
>;
```

### 2.4 Implementare Completă

```typescript
// /apps/workers/src/processors/ai/agent-orchestrate.processor.ts

import { Job, Queue, Worker } from "bullmq";
import { Logger } from "pino";
import { db } from "@cerniq/db";
import {
  gold_negotiations,
  gold_ai_conversations,
  gold_negotiation_state_history,
} from "@cerniq/db/schema";
import { eq, and } from "drizzle-orm";
import { XAI } from "@xai/sdk";
import { createMCPClient } from "@cerniq/mcp/client";
import { runGuardrails, GuardrailResult } from "@cerniq/guardrails";
import { Redis } from "ioredis";
import {
  AgentOrchestrateJobData,
  AgentOrchestrateJobDataSchema,
  AgentOrchestrateResult,
} from "@cerniq/shared/schemas";
import { metrics } from "@cerniq/observability";

// Constants
const MAX_REGENERATION_ATTEMPTS = 3;
const MAX_TOOL_CALLS_PER_TURN = 10;
const CONVERSATION_HISTORY_LIMIT = 20;
const LLM_MODEL = "grok-4";
const TOKEN_COST_PER_1K_PROMPT = 0.003; // USD
const TOKEN_COST_PER_1K_COMPLETION = 0.015; // USD

// xAI Client singleton
let xaiClient: XAI | null = null;

function getXAIClient(): XAI {
  if (!xaiClient) {
    xaiClient = new XAI({
      apiKey: process.env.XAI_API_KEY!,
      timeout: 60000, // 60s per request
      maxRetries: 2,
    });
  }
  return xaiClient;
}

// MCP Tools Definition
const MCP_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_products",
      description:
        "Caută produse în catalog folosind căutare hibridă (semantic + lexical)",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Query de căutare în limba română",
          },
          filters: {
            type: "object",
            properties: {
              priceMin: { type: "number" },
              priceMax: { type: "number" },
              category: { type: "string" },
              inStock: { type: "boolean" },
            },
          },
          limit: { type: "number", default: 10 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_realtime_stock",
      description:
        "Verifică stocul în timp real pentru un produs (OBLIGATORIU înainte de a confirma disponibilitate)",
      parameters: {
        type: "object",
        properties: {
          sku: { type: "string", description: "Codul SKU al produsului" },
          quantity: {
            type: "number",
            description: "Cantitatea dorită",
            default: 1,
          },
        },
        required: ["sku"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_discount",
      description:
        "Calculează discountul maxim permis pentru un produs (OBLIGATORIU înainte de a oferi discount)",
      parameters: {
        type: "object",
        properties: {
          sku: { type: "string", description: "Codul SKU al produsului" },
          quantity: { type: "number", description: "Cantitatea comandată" },
          clientTier: {
            type: "string",
            enum: ["NEW", "REGULAR", "VIP", "WHOLESALE"],
          },
        },
        required: ["sku", "quantity"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_product_details",
      description: "Obține detaliile complete ale unui produs",
      parameters: {
        type: "object",
        properties: {
          sku: { type: "string", description: "Codul SKU al produsului" },
        },
        required: ["sku"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_cart",
      description: "Actualizează coșul de cumpărături al negocierii",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["ADD", "REMOVE", "UPDATE_QUANTITY", "CLEAR"],
          },
          sku: { type: "string" },
          quantity: { type: "number" },
          discountPercent: { type: "number" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "validate_client_data",
      description: "Validează datele fiscale ale clientului (CIF, adresă)",
      parameters: {
        type: "object",
        properties: {
          cif: { type: "string", description: "Codul de identificare fiscală" },
          name: { type: "string" },
          address: {
            type: "object",
            properties: {
              street: { type: "string" },
              city: { type: "string" },
              county: { type: "string" },
              postalCode: { type: "string" },
            },
          },
        },
        required: ["cif"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_proforma",
      description: "Creează o proformă pentru negocierea curentă",
      parameters: {
        type: "object",
        properties: {
          paymentTermDays: { type: "number", default: 15 },
          validityDays: { type: "number", default: 7 },
          notes: { type: "string" },
        },
      },
    },
  },
];

// Main Processor
export async function agentOrchestrateProcessor(
  job: Job<AgentOrchestrateJobData>,
  logger: Logger,
  redis: Redis,
): Promise<AgentOrchestrateResult> {
  const startTime = Date.now();
  const correlationId = job.data.correlationId;

  // Validate input
  const validationResult = AgentOrchestrateJobDataSchema.safeParse(job.data);
  if (!validationResult.success) {
    throw new Error(`Invalid job data: ${validationResult.error.message}`);
  }

  const { shopId, leadId, negotiationId, message, context, options } = job.data;
  const maxAttempts =
    options?.maxRegenerationAttempts ?? MAX_REGENERATION_ATTEMPTS;

  logger.info(
    { correlationId, negotiationId, state: context.currentState },
    "Starting agent orchestration",
  );

  // Initialize result
  const result: AgentOrchestrateResult = {
    responseContent: "",
    toolsCalled: [],
    guardrailChecks: [],
    suggestedActions: [],
    tokensUsed: { prompt: 0, completion: 0, total: 0, estimatedCost: 0 },
    regenerationAttempts: 0,
    requiresHumanReview: options?.forceHumanReview ?? false,
    processingTimeMs: 0,
    modelUsed: LLM_MODEL,
  };

  // Build system prompt
  const systemPrompt = buildSalesAgentSystemPrompt(context);

  // Prepare messages
  const messages: Array<{
    role: string;
    content: string;
    toolCallId?: string;
  }> = [
    { role: "system", content: systemPrompt },
    ...context.conversationHistory.slice(-CONVERSATION_HISTORY_LIMIT),
    { role: "user", content: message.content },
  ];

  // MCP Client
  const mcpClient = await createMCPClient(shopId);

  // Regeneration loop
  let regenerationCount = 0;
  let finalResponse: string | null = null;
  let guardrailFeedback: string | null = null;

  try {
    while (regenerationCount < maxAttempts && !finalResponse) {
      // Add guardrail feedback if regenerating
      if (guardrailFeedback) {
        messages.push({
          role: "system",
          content: `⚠️ EROARE DETECTATĂ: ${guardrailFeedback}. Regenerează răspunsul corectând problema menționată.`,
        });

        logger.warn(
          {
            correlationId,
            attempt: regenerationCount + 1,
            feedback: guardrailFeedback,
          },
          "Regenerating response due to guardrail failure",
        );
      }

      // Call xAI Grok
      const xai = getXAIClient();

      let response = await xai.chat.completions.create({
        model: LLM_MODEL,
        messages: messages.map((m) => ({
          role: m.role as "system" | "user" | "assistant" | "tool",
          content: m.content,
          ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
        })),
        tools: MCP_TOOLS,
        tool_choice: "auto",
        max_tokens: options?.responseMaxTokens ?? 500,
        temperature: options?.temperature ?? 0.7,
      });

      // Track tokens
      result.tokensUsed.prompt += response.usage?.prompt_tokens ?? 0;
      result.tokensUsed.completion += response.usage?.completion_tokens ?? 0;

      // Handle tool calls loop
      let toolCallCount = 0;

      while (
        response.choices[0].message.tool_calls &&
        response.choices[0].message.tool_calls.length > 0 &&
        toolCallCount < MAX_TOOL_CALLS_PER_TURN
      ) {
        const assistantMessage = response.choices[0].message;

        // Add assistant message with tool calls
        messages.push({
          role: "assistant",
          content: assistantMessage.content ?? "",
        });

        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          toolCallCount++;
          const toolStartTime = Date.now();

          try {
            const args = JSON.parse(toolCall.function.arguments);

            // Execute tool via MCP
            const toolResult = await executeMCPTool(
              mcpClient,
              toolCall.function.name,
              args,
              { shopId, leadId, negotiationId },
              logger,
            );

            result.toolsCalled.push({
              name: toolCall.function.name,
              arguments: args,
              result: toolResult,
              durationMs: Date.now() - toolStartTime,
              cached: toolResult._cached ?? false,
            });

            // Add tool result to conversation
            messages.push({
              role: "tool",
              content: JSON.stringify(toolResult),
              toolCallId: toolCall.id,
            });

            // Update metrics
            metrics.toolCallsTotal.inc({
              tool: toolCall.function.name,
              status: "success",
            });
            metrics.toolCallDuration.observe(
              { tool: toolCall.function.name },
              Date.now() - toolStartTime,
            );
          } catch (error: any) {
            logger.error(
              {
                correlationId,
                tool: toolCall.function.name,
                error: error.message,
              },
              "Tool execution failed",
            );

            result.toolsCalled.push({
              name: toolCall.function.name,
              arguments: JSON.parse(toolCall.function.arguments),
              result: null,
              durationMs: Date.now() - toolStartTime,
              cached: false,
              error: {
                code: error.code ?? "TOOL_ERROR",
                message: error.message,
                retryable: error.retryable ?? false,
              },
            });

            // Add error to conversation
            messages.push({
              role: "tool",
              content: JSON.stringify({
                error: true,
                message: `Eroare la ${toolCall.function.name}: ${error.message}`,
              }),
              toolCallId: toolCall.id,
            });

            metrics.toolCallsTotal.inc({
              tool: toolCall.function.name,
              status: "error",
            });
          }
        }

        // Get next response after tool calls
        response = await xai.chat.completions.create({
          model: LLM_MODEL,
          messages: messages.map((m) => ({
            role: m.role as "system" | "user" | "assistant" | "tool",
            content: m.content,
            ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
          })),
          tools: MCP_TOOLS,
          tool_choice: "auto",
          max_tokens: options?.responseMaxTokens ?? 500,
          temperature: options?.temperature ?? 0.7,
        });

        // Track additional tokens
        result.tokensUsed.prompt += response.usage?.prompt_tokens ?? 0;
        result.tokensUsed.completion += response.usage?.completion_tokens ?? 0;
      }

      // Extract final text response
      const textContent = response.choices[0].message.content ?? "";

      // Run guardrails on response
      const guardrailResults = await runGuardrails(textContent, {
        currentState: context.currentState,
        cartItems: context.cartItems,
        toolResults: result.toolsCalled,
        shopId,
        negotiationId,
      });

      result.guardrailChecks.push(...guardrailResults);

      // Check if all guardrails passed
      const failedGuardrails = guardrailResults.filter((g) => !g.passed);

      if (failedGuardrails.length === 0) {
        finalResponse = textContent;
        logger.info(
          { correlationId, regenerations: regenerationCount },
          "Response passed all guardrails",
        );
      } else {
        // Need to regenerate
        guardrailFeedback = failedGuardrails
          .map((g) => `${g.type}: ${g.correctionMessage ?? g.details}`)
          .join("; ");

        regenerationCount++;
        result.regenerationAttempts = regenerationCount;

        // Track guardrail failures
        for (const failure of failedGuardrails) {
          metrics.guardrailFailures.inc({ type: failure.type });
        }
      }
    }

    // Calculate token cost
    result.tokensUsed.total =
      result.tokensUsed.prompt + result.tokensUsed.completion;
    result.tokensUsed.estimatedCost =
      (result.tokensUsed.prompt / 1000) * TOKEN_COST_PER_1K_PROMPT +
      (result.tokensUsed.completion / 1000) * TOKEN_COST_PER_1K_COMPLETION;

    // If still no valid response after max attempts, escalate to human
    if (!finalResponse) {
      result.requiresHumanReview = true;
      result.humanReviewReason = `Max regeneration attempts (${maxAttempts}) reached. Guardrail failures: ${guardrailFeedback}`;
      result.humanReviewPriority = "HIGH";
      finalResponse =
        "Vă mulțumim pentru mesaj. Un coleg vă va contacta în curând pentru a vă ajuta.";

      // Trigger HITL queue
      await triggerHumanReview(
        job.queueName,
        {
          correlationId,
          negotiationId,
          leadId,
          reason: result.humanReviewReason,
          priority: result.humanReviewPriority,
          context: {
            originalMessage: message.content,
            failedGuardrails: result.guardrailChecks.filter((g) => !g.passed),
            lastAttemptedResponse:
              result.guardrailChecks[result.guardrailChecks.length - 1]
                ?.details,
          },
        },
        redis,
        logger,
      );

      metrics.humanEscalations.inc({ reason: "max_regenerations" });
    }

    result.responseContent = finalResponse;

    // Determine state transition
    const stateTransition = await determineStateTransition(
      context.currentState,
      message.content,
      result.toolsCalled,
      finalResponse,
      context.cartItems,
    );

    if (stateTransition) {
      result.stateTransition = stateTransition;

      // Apply state transition
      await applyStateTransition(negotiationId, stateTransition, logger);
    }

    // Determine suggested actions
    result.suggestedActions = determineSuggestedActions(
      stateTransition?.to ?? context.currentState,
      result.toolsCalled,
      context.cartItems,
    );

    // Save conversation to database
    await saveConversation(
      negotiationId,
      leadId,
      shopId,
      message,
      result,
      logger,
    );
  } finally {
    // Close MCP client
    await mcpClient?.close();
  }

  result.processingTimeMs = Date.now() - startTime;

  // Update metrics
  metrics.agentOrchestrationDuration.observe(result.processingTimeMs);
  metrics.agentOrchestrationTotal.inc({
    status: result.requiresHumanReview ? "escalated" : "completed",
    hadRegeneration: result.regenerationAttempts > 0 ? "yes" : "no",
  });
  metrics.tokensUsedTotal.inc({ model: LLM_MODEL }, result.tokensUsed.total);

  logger.info(
    {
      correlationId,
      negotiationId,
      toolsCalled: result.toolsCalled.length,
      regenerations: result.regenerationAttempts,
      stateTransition: result.stateTransition,
      processingTimeMs: result.processingTimeMs,
      tokensUsed: result.tokensUsed.total,
    },
    "Agent orchestration completed",
  );

  return result;
}

// Helper Functions

function buildSalesAgentSystemPrompt(context: any): string {
  const cartSummary =
    context.cartItems.length > 0
      ? context.cartItems
          .map(
            (item: any) =>
              `- ${item.sku}: ${item.title} x${item.quantity} @ ${item.unitPrice} RON`,
          )
          .join("\n")
      : "Coșul este gol";

  const clientInfo = context.clientData
    ? `CIF: ${context.clientData.cif ?? "Necunoscut"}, Nume: ${context.clientData.name ?? "Necunoscut"}`
    : "Date client necunoscute";

  return `Ești un agent de vânzări profesionist pentru ${context.shopName}.
Lucrezi în industria agricolă din România și înțelegi nevoile fermierilor.

═══════════════════════════════════════════════════════════════
REGULI ABSOLUTE - NENEGOCIABILE (Încălcarea = Eroare Gravă)
═══════════════════════════════════════════════════════════════

1. PREȚURI
   ❌ NICIODATĂ nu inventa prețuri
   ✅ Folosește DOAR rezultatele din tool "get_product_details" sau "search_products"
   
2. STOC
   ❌ NICIODATĂ nu confirma disponibilitate fără verificare
   ✅ OBLIGATORIU apelează "check_realtime_stock" înainte de a confirma
   
3. DISCOUNT
   ❌ NICIODATĂ nu oferi discount fără calcul
   ✅ OBLIGATORIU apelează "calculate_discount" și respectă limita returnată
   ✅ Discount maxim permis: ${context.shopConfig.allowedDiscountMax}%
   
4. SKU/CODURI
   ❌ NICIODATĂ nu genera coduri de produs inventate
   ✅ Folosește DOAR SKU-uri returnate de căutare

═══════════════════════════════════════════════════════════════
CONTEXT CONVERSAȚIE CURENTĂ
═══════════════════════════════════════════════════════════════

STARE NEGOCIERE: ${context.currentState}
MONEDĂ: ${context.shopConfig.currency}
LIMBĂ: Română

COS CUMPĂRĂTURI:
${cartSummary}

DATE CLIENT:
${clientInfo}

═══════════════════════════════════════════════════════════════
INSTRUCȚIUNI PE STĂRI
═══════════════════════════════════════════════════════════════

${getStateInstructions(context.currentState)}

═══════════════════════════════════════════════════════════════
STIL COMUNICARE
═══════════════════════════════════════════════════════════════

- Răspunde natural, profesionist și concis în limba română
- Folosește diacritice corecte (ă, â, î, ș, ț)
- Evită jargonul tehnic excesiv
- Fii empatic cu provocările fermierilor
- Oferă soluții, nu doar produse
- Închide mesajele cu o întrebare sau acțiune clară

Acum procesează mesajul clientului și răspunde conform regulilor.`;
}

function getStateInstructions(state: string): string {
  const instructions: Record<string, string> = {
    DISCOVERY: `
📍 DISCOVERY - Descoperă nevoile clientului
- Pune întrebări pentru a înțelege ce caută
- Folosește "search_products" pentru a găsi opțiuni relevante
- NU oferi prețuri exacte încă - doar intervale
- Obiectiv: Identifică 2-3 produse potrivite`,

    PROPOSAL: `
📍 PROPOSAL - Prezintă soluții concrete
- Prezintă 2-3 opțiuni cu prețuri (din tool results)
- OBLIGATORIU verifică stocul cu "check_realtime_stock"
- Evidențiază beneficiile pentru fermier
- Obiectiv: Clientul să aleagă o opțiune`,

    NEGOTIATION: `
📍 NEGOTIATION - Negociază termenii
- Poți oferi discount DOAR dacă clientul cere
- OBLIGATORIU folosește "calculate_discount" pentru limită
- NU depăși discountul maxim returnat
- Actualizează coșul cu "update_cart"
- Obiectiv: Acord pe preț și cantitate`,

    CLOSING: `
📍 CLOSING - Finalizează tranzacția
- Cere datele de facturare: CIF, adresă completă
- Validează cu "validate_client_data"
- Confirmă rezumatul comenzii
- Obiectiv: Date complete pentru proformă`,

    PROFORMA_SENT: `
📍 PROFORMA_SENT - Urmărire proformă
- Proforma a fost trimisă, așteaptă confirmare
- Răspunde la întrebări despre proformă
- Poți trimite reminder dacă e cazul
- Obiectiv: Clientul să accepte proforma`,

    PROFORMA_ACCEPTED: `
📍 PROFORMA_ACCEPTED - Emitere factură
- Clientul a acceptat, pregătim factura
- Confirmă metoda de plată
- Anunță că factura va fi emisă
- Obiectiv: Tranziție la facturare`,

    INVOICED: `
📍 INVOICED - Factură emisă
- Factura este emisă
- Oferă detalii despre plată
- Răspunde la întrebări administrative
- Obiectiv: Clientul să plătească`,
  };

  return (
    instructions[state] ??
    `
📍 ${state} - Stare curentă
- Continuă conversația profesionist
- Adaptează-te la nevoile clientului`
  );
}

async function executeMCPTool(
  mcpClient: any,
  toolName: string,
  args: Record<string, any>,
  context: { shopId: string; leadId: string; negotiationId: string },
  logger: Logger,
): Promise<any> {
  logger.debug({ toolName, args }, "Executing MCP tool");

  // Route to appropriate MCP resource/tool
  switch (toolName) {
    case "search_products":
      return await mcpClient.callTool("search_products", {
        ...args,
        shopId: context.shopId,
      });

    case "check_realtime_stock":
      return await mcpClient.callTool("check_realtime_stock", {
        sku: args.sku,
        quantity: args.quantity ?? 1,
        shopId: context.shopId,
      });

    case "calculate_discount":
      return await mcpClient.callTool("calculate_discount", {
        sku: args.sku,
        quantity: args.quantity,
        clientTier: args.clientTier ?? "NEW",
        shopId: context.shopId,
        negotiationId: context.negotiationId,
      });

    case "get_product_details":
      return await mcpClient.readResource(`product://${args.sku}`, {
        shopId: context.shopId,
      });

    case "update_cart":
      return await mcpClient.callTool("update_cart", {
        ...args,
        negotiationId: context.negotiationId,
      });

    case "validate_client_data":
      return await mcpClient.callTool("validate_client_data", {
        ...args,
        leadId: context.leadId,
      });

    case "create_proforma":
      return await mcpClient.callTool("create_proforma", {
        ...args,
        negotiationId: context.negotiationId,
        shopId: context.shopId,
      });

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function determineStateTransition(
  currentState: string,
  userMessage: string,
  toolsCalled: any[],
  response: string,
  cartItems: any[],
): Promise<{
  from: string;
  to: string;
  reason: string;
  triggeredBy: string;
} | null> {
  // State transition rules based on actions and context
  const rules: Array<{
    from: string[];
    to: string;
    condition: () => boolean;
    reason: string;
    trigger: string;
  }> = [
    // DISCOVERY → PROPOSAL when products are searched and cart has items
    {
      from: ["DISCOVERY"],
      to: "PROPOSAL",
      condition: () =>
        toolsCalled.some(
          (t) => t.name === "search_products" && t.result?.products?.length > 0,
        ) &&
        (toolsCalled.some((t) => t.name === "update_cart") ||
          cartItems.length > 0),
      reason: "Produse identificate și adăugate în coș",
      trigger: "TOOL_RESULT",
    },

    // PROPOSAL → NEGOTIATION when stock is checked and client asks about price/discount
    {
      from: ["PROPOSAL"],
      to: "NEGOTIATION",
      condition: () =>
        toolsCalled.some((t) => t.name === "check_realtime_stock") &&
        (userMessage.toLowerCase().includes("discount") ||
          userMessage.toLowerCase().includes("preț") ||
          userMessage.toLowerCase().includes("reducere")),
      reason: "Client interesat de negociere preț",
      trigger: "USER_ACTION",
    },

    // NEGOTIATION → CLOSING when discount is calculated and client wants to proceed
    {
      from: ["NEGOTIATION"],
      to: "CLOSING",
      condition: () =>
        (toolsCalled.some((t) => t.name === "calculate_discount") ||
          cartItems.length > 0) &&
        (userMessage.toLowerCase().includes("comand") ||
          userMessage.toLowerCase().includes("cumpăr") ||
          userMessage.toLowerCase().includes("ok") ||
          userMessage.toLowerCase().includes("accept")),
      reason: "Client acceptă să finalizeze comanda",
      trigger: "USER_ACTION",
    },

    // CLOSING → PROFORMA_SENT when client data is validated and proforma created
    {
      from: ["CLOSING"],
      to: "PROFORMA_SENT",
      condition: () =>
        toolsCalled.some(
          (t) => t.name === "validate_client_data" && t.result?.valid,
        ) &&
        toolsCalled.some(
          (t) => t.name === "create_proforma" && t.result?.proformaId,
        ),
      reason: "Date validate și proformă creată",
      trigger: "TOOL_RESULT",
    },

    // PROFORMA_SENT → PROFORMA_ACCEPTED when client confirms
    {
      from: ["PROFORMA_SENT"],
      to: "PROFORMA_ACCEPTED",
      condition: () =>
        userMessage.toLowerCase().includes("accept") ||
        userMessage.toLowerCase().includes("confirm") ||
        userMessage.toLowerCase().includes("de acord"),
      reason: "Client a acceptat proforma",
      trigger: "USER_ACTION",
    },

    // Any state → ON_HOLD if client asks to wait
    {
      from: ["DISCOVERY", "PROPOSAL", "NEGOTIATION"],
      to: "ON_HOLD",
      condition: () =>
        userMessage.toLowerCase().includes("aștept") ||
        userMessage.toLowerCase().includes("mai târziu") ||
        userMessage.toLowerCase().includes("revenim"),
      reason: "Client solicită pauză",
      trigger: "USER_ACTION",
    },

    // Any state → DEAD if client explicitly rejects
    {
      from: [
        "DISCOVERY",
        "PROPOSAL",
        "NEGOTIATION",
        "CLOSING",
        "PROFORMA_SENT",
      ],
      to: "DEAD",
      condition: () =>
        userMessage.toLowerCase().includes("nu mai") ||
        userMessage.toLowerCase().includes("renunț") ||
        userMessage.toLowerCase().includes("anulează"),
      reason: "Client a renunțat la negociere",
      trigger: "USER_ACTION",
    },
  ];

  // Find first matching rule
  for (const rule of rules) {
    if (rule.from.includes(currentState) && rule.condition()) {
      return {
        from: currentState,
        to: rule.to,
        reason: rule.reason,
        triggeredBy: rule.trigger,
      };
    }
  }

  return null;
}

async function applyStateTransition(
  negotiationId: string,
  transition: { from: string; to: string; reason: string; triggeredBy: string },
  logger: Logger,
): Promise<void> {
  // Update negotiation state
  await db
    .update(gold_negotiations)
    .set({
      previous_state: transition.from,
      negotiation_state: transition.to,
      state_changed_at: new Date(),
      state_change_reason: transition.reason,
    })
    .where(eq(gold_negotiations.id, negotiationId));

  // Log state history
  await db.insert(gold_negotiation_state_history).values({
    negotiation_id: negotiationId,
    from_state: transition.from,
    to_state: transition.to,
    reason: transition.reason,
    triggered_by: transition.triggeredBy,
    transitioned_at: new Date(),
  });

  logger.info({ negotiationId, transition }, "State transition applied");
}

function determineSuggestedActions(
  currentState: string,
  toolsCalled: any[],
  cartItems: any[],
): string[] {
  const actions: Record<string, string[]> = {
    DISCOVERY: ["Caută produse relevante", "Întreabă despre nevoi specifice"],
    PROPOSAL: ["Verifică stocul", "Prezintă alternative", "Actualizează coșul"],
    NEGOTIATION: ["Calculează discount maxim", "Confirmă cantități finale"],
    CLOSING: ["Validează CIF", "Confirmă adresa de livrare", "Emite proformă"],
    PROFORMA_SENT: ["Trimite reminder", "Răspunde la întrebări"],
    PROFORMA_ACCEPTED: ["Convertește în factură"],
    INVOICED: ["Verifică plata", "Trimite în SPV"],
  };

  return actions[currentState] ?? ["Continuă conversația"];
}

async function triggerHumanReview(
  queueName: string,
  data: {
    correlationId: string;
    negotiationId: string;
    leadId: string;
    reason: string;
    priority: string;
    context: any;
  },
  redis: Redis,
  logger: Logger,
): Promise<void> {
  const hitlQueue = new Queue("hitl:review:request", { connection: redis });

  await hitlQueue.add(
    "review-request",
    {
      ...data,
      sourceQueue: queueName,
      requestedAt: new Date().toISOString(),
      slaDeadline: new Date(
        Date.now() + getSLAByPriority(data.priority),
      ).toISOString(),
    },
    {
      priority: getPriorityNumber(data.priority),
      attempts: 1,
    },
  );

  logger.info(
    { negotiationId: data.negotiationId, priority: data.priority },
    "Human review triggered",
  );
}

function getSLAByPriority(priority: string): number {
  const slaMs: Record<string, number> = {
    CRITICAL: 15 * 60 * 1000, // 15 min
    HIGH: 60 * 60 * 1000, // 1 hour
    MEDIUM: 4 * 60 * 60 * 1000, // 4 hours
    LOW: 24 * 60 * 60 * 1000, // 24 hours
  };
  return slaMs[priority] ?? slaMs["MEDIUM"];
}

function getPriorityNumber(priority: string): number {
  const priorities: Record<string, number> = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
  };
  return priorities[priority] ?? 3;
}

async function saveConversation(
  negotiationId: string,
  leadId: string,
  shopId: string,
  message: any,
  result: AgentOrchestrateResult,
  logger: Logger,
): Promise<void> {
  // Save user message
  await db.insert(gold_ai_conversations).values({
    lead_id: leadId,
    negotiation_id: negotiationId,
    shop_id: shopId,
    role: "user",
    content: message.content,
    channel: message.channel,
    external_message_id: message.externalMessageId,
    created_at: new Date(message.timestamp),
  });

  // Save assistant response
  await db.insert(gold_ai_conversations).values({
    lead_id: leadId,
    negotiation_id: negotiationId,
    shop_id: shopId,
    role: "assistant",
    content: result.responseContent,
    tool_calls: result.toolsCalled.length > 0 ? result.toolsCalled : null,
    tokens_used: result.tokensUsed.total,
    model_used: result.modelUsed,
    guardrail_checks: result.guardrailChecks,
    was_regenerated: result.regenerationAttempts > 0,
    regeneration_count: result.regenerationAttempts,
    channel: message.channel,
    processing_time_ms: result.processingTimeMs,
    created_at: new Date(),
  });

  logger.debug(
    { negotiationId, tokensUsed: result.tokensUsed.total },
    "Conversation saved",
  );
}
```

### 2.5 Worker Factory și Inițializare

```typescript
// /apps/workers/src/workers/ai-agent-orchestrate.worker.ts

import { Worker, Queue, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { createLogger } from "@cerniq/observability";
import { agentOrchestrateProcessor } from "../processors/ai/agent-orchestrate.processor";
import { createWorkerOptions } from "../config/worker.config";

const QUEUE_NAME = "ai:agent:orchestrate";

export function createAgentOrchestrateWorker(redis: Redis): Worker {
  const logger = createLogger("ai:agent:orchestrate");

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => agentOrchestrateProcessor(job, logger, redis),
    {
      ...createWorkerOptions(redis),
      concurrency: 50,
      limiter: {
        max: 100,
        duration: 60000, // 100 jobs per minute
      },
    },
  );

  // Event handlers
  worker.on("completed", (job, result) => {
    logger.info(
      {
        jobId: job.id,
        negotiationId: job.data.negotiationId,
        processingTime: result.processingTimeMs,
      },
      "Job completed",
    );
  });

  worker.on("failed", (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
      },
      "Job failed",
    );
  });

  worker.on("stalled", (jobId) => {
    logger.warn({ jobId }, "Job stalled");
  });

  return worker;
}

// Queue factory
export function createAgentOrchestrateQueue(redis: Redis): Queue {
  return new Queue(QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        age: 24 * 3600, // 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // 7 days
      },
    },
  });
}
```

---

## 3. Worker #10: etapa3:ai:agent:response-generate

### 3.1 Specificații

| Atribut            | Valoare                             |
| ------------------ | ----------------------------------- |
| **Queue Name**     | `etapa3:ai:agent:response-generate` |
| **Concurrency**    | 100                                 |
| **Timeout**        | 30000ms                             |
| **Rate Limit**     | 200/min (LLM)                       |
| **Retry Strategy** | 2 attempts, 2s delay                |

### 3.2 Scop

Worker specializat pentru generarea de răspunsuri text când nu este nevoie de tool calls - folosit pentru:

- Răspunsuri de confirmare
- Mesaje de followup
- Clarificări simple
- Răspunsuri când context-ul este deja complet

### 3.3 Job Data Schema

```typescript
// /packages/shared/src/schemas/ai-response.schemas.ts

import { z } from "zod";

export const ResponseGenerateJobDataSchema = z.object({
  correlationId: z.string().uuid(),
  shopId: z.string().uuid(),
  negotiationId: z.string().uuid(),

  prompt: z.object({
    systemPrompt: z.string(),
    userMessage: z.string(),
    conversationHistory: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        }),
      )
      .max(10),
  }),

  context: z.object({
    currentState: z.string(),
    clientName: z.string().optional(),
    pendingAction: z.string().optional(),
    additionalContext: z.record(z.any()).optional(),
  }),

  options: z.object({
    maxTokens: z.number().min(50).max(1000).default(300),
    temperature: z.number().min(0).max(1).default(0.7),
    responseType: z.enum([
      "CONFIRMATION",
      "CLARIFICATION",
      "FOLLOWUP",
      "GENERAL",
    ]),
  }),
});

export type ResponseGenerateJobData = z.infer<
  typeof ResponseGenerateJobDataSchema
>;

export const ResponseGenerateResultSchema = z.object({
  content: z.string(),
  tokensUsed: z.object({
    prompt: z.number(),
    completion: z.number(),
    total: z.number(),
  }),
  modelUsed: z.string(),
  processingTimeMs: z.number(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).optional(),
});

export type ResponseGenerateResult = z.infer<
  typeof ResponseGenerateResultSchema
>;
```

### 3.4 Implementare

```typescript
// /apps/workers/src/processors/ai/response-generate.processor.ts

import { Job } from "bullmq";
import { Logger } from "pino";
import { XAI } from "@xai/sdk";
import {
  ResponseGenerateJobData,
  ResponseGenerateJobDataSchema,
  ResponseGenerateResult,
} from "@cerniq/shared/schemas";
import { metrics } from "@cerniq/observability";

const MODEL = "grok-4";

export async function responseGenerateProcessor(
  job: Job<ResponseGenerateJobData>,
  logger: Logger,
): Promise<ResponseGenerateResult> {
  const startTime = Date.now();

  // Validate input
  const validationResult = ResponseGenerateJobDataSchema.safeParse(job.data);
  if (!validationResult.success) {
    throw new Error(`Invalid job data: ${validationResult.error.message}`);
  }

  const { correlationId, prompt, context, options } = job.data;

  logger.debug(
    { correlationId, responseType: options.responseType },
    "Generating response",
  );

  // Build messages
  const messages = [
    { role: "system" as const, content: prompt.systemPrompt },
    ...prompt.conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: prompt.userMessage },
  ];

  // Call LLM
  const xai = new XAI({ apiKey: process.env.XAI_API_KEY! });

  const response = await xai.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
  });

  const content = response.choices[0].message.content ?? "";

  // Analyze sentiment (simple heuristic)
  const sentiment = analyzeSentiment(content);

  const result: ResponseGenerateResult = {
    content,
    tokensUsed: {
      prompt: response.usage?.prompt_tokens ?? 0,
      completion: response.usage?.completion_tokens ?? 0,
      total: response.usage?.total_tokens ?? 0,
    },
    modelUsed: MODEL,
    processingTimeMs: Date.now() - startTime,
    sentiment,
  };

  // Metrics
  metrics.responseGenerationDuration.observe(result.processingTimeMs);
  metrics.tokensUsedTotal.inc({ model: MODEL }, result.tokensUsed.total);

  logger.info(
    {
      correlationId,
      tokensUsed: result.tokensUsed.total,
      processingTime: result.processingTimeMs,
    },
    "Response generated",
  );

  return result;
}

function analyzeSentiment(text: string): "POSITIVE" | "NEUTRAL" | "NEGATIVE" {
  const positiveKeywords = [
    "mulțumim",
    "bucuros",
    "perfect",
    "excelent",
    "minunat",
  ];
  const negativeKeywords = [
    "regret",
    "scuze",
    "din păcate",
    "imposibil",
    "problemă",
  ];

  const lowerText = text.toLowerCase();

  const positiveCount = positiveKeywords.filter((k) =>
    lowerText.includes(k),
  ).length;
  const negativeCount = negativeKeywords.filter((k) =>
    lowerText.includes(k),
  ).length;

  if (positiveCount > negativeCount) return "POSITIVE";
  if (negativeCount > positiveCount) return "NEGATIVE";
  return "NEUTRAL";
}

// Worker factory
export function createResponseGenerateWorker(redis: Redis): Worker {
  const logger = createLogger("ai:agent:response-generate");

  return new Worker(
    "ai:agent:response-generate",
    async (job) => responseGenerateProcessor(job, logger),
    {
      connection: redis,
      concurrency: 100,
      limiter: {
        max: 200,
        duration: 60000,
      },
    },
  );
}
```

---

## 4. Worker #11: etapa3:ai:tool:execute

### 4.1 Specificații

| Atribut            | Valoare                           |
| ------------------ | --------------------------------- |
| **Queue Name**     | `etapa3:ai:tool:execute`          |
| **Concurrency**    | 200                               |
| **Timeout**        | 30000ms                           |
| **Rate Limit**     | Variabil per tool                 |
| **Retry Strategy** | 3 attempts, tool-specific backoff |

### 4.2 Scop

Executor individual pentru tool calls MCP - permite:

- Execuție paralelă a mai multor tools
- Caching per tool
- Rate limiting granular
- Retry logic specifică fiecărui tool

### 4.3 Job Data Schema

```typescript
// /packages/shared/src/schemas/ai-tool.schemas.ts

import { z } from "zod";

export const ToolExecuteJobDataSchema = z.object({
  correlationId: z.string().uuid(),
  shopId: z.string().uuid(),
  negotiationId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),

  tool: z.object({
    name: z.string(),
    arguments: z.record(z.any()),
    callId: z.string().optional(), // For tracking in LLM conversation
  }),

  options: z
    .object({
      useCache: z.boolean().default(true),
      cacheTTL: z.number().default(300), // 5 minutes
      timeout: z.number().default(30000),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL"),
    })
    .optional(),
});

export type ToolExecuteJobData = z.infer<typeof ToolExecuteJobDataSchema>;

export const ToolExecuteResultSchema = z.object({
  toolName: z.string(),
  success: z.boolean(),
  result: z.any(),
  executionTimeMs: z.number(),
  cached: z.boolean(),
  cacheKey: z.string().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
      details: z.any().optional(),
    })
    .optional(),
  metadata: z
    .object({
      mcpServerLatency: z.number().optional(),
      externalApiCalls: z.number().optional(),
      bytesProcessed: z.number().optional(),
    })
    .optional(),
});

export type ToolExecuteResult = z.infer<typeof ToolExecuteResultSchema>;
```

### 4.4 Implementare cu Caching și Rate Limiting

```typescript
// /apps/workers/src/processors/ai/tool-execute.processor.ts

import { Job } from "bullmq";
import { Logger } from "pino";
import { Redis } from "ioredis";
import { createMCPClient, MCPClient } from "@cerniq/mcp/client";
import {
  ToolExecuteJobData,
  ToolExecuteJobDataSchema,
  ToolExecuteResult,
} from "@cerniq/shared/schemas";
import { metrics } from "@cerniq/observability";
import { createHash } from "crypto";

// Tool-specific configurations
const TOOL_CONFIG: Record<
  string,
  {
    cacheable: boolean;
    cacheTTL: number;
    timeout: number;
    rateLimit?: { max: number; window: number };
  }
> = {
  search_products: {
    cacheable: true,
    cacheTTL: 300, // 5 min
    timeout: 10000,
  },
  check_realtime_stock: {
    cacheable: true,
    cacheTTL: 30, // 30 sec - stocul se schimbă rapid
    timeout: 5000,
    rateLimit: { max: 100, window: 60 }, // 100/min
  },
  calculate_discount: {
    cacheable: true,
    cacheTTL: 60, // 1 min
    timeout: 5000,
  },
  get_product_details: {
    cacheable: true,
    cacheTTL: 3600, // 1 hour
    timeout: 10000,
  },
  update_cart: {
    cacheable: false,
    cacheTTL: 0,
    timeout: 5000,
  },
  validate_client_data: {
    cacheable: true,
    cacheTTL: 86400, // 24 hours - datele fiscale nu se schimbă des
    timeout: 15000,
    rateLimit: { max: 60, window: 60 }, // 60/min (ANAF API)
  },
  create_proforma: {
    cacheable: false,
    cacheTTL: 0,
    timeout: 30000,
    rateLimit: { max: 30, window: 60 }, // 30/min (Oblio API)
  },
};

// MCP Client pool
const mcpClientPool: Map<string, MCPClient> = new Map();

async function getMCPClient(shopId: string): Promise<MCPClient> {
  if (!mcpClientPool.has(shopId)) {
    const client = await createMCPClient(shopId);
    mcpClientPool.set(shopId, client);
  }
  return mcpClientPool.get(shopId)!;
}

export async function toolExecuteProcessor(
  job: Job<ToolExecuteJobData>,
  logger: Logger,
  redis: Redis,
): Promise<ToolExecuteResult> {
  const startTime = Date.now();

  // Validate input
  const validationResult = ToolExecuteJobDataSchema.safeParse(job.data);
  if (!validationResult.success) {
    throw new Error(`Invalid job data: ${validationResult.error.message}`);
  }

  const { correlationId, shopId, negotiationId, leadId, tool, options } =
    job.data;
  const toolName = tool.name;
  const toolConfig = TOOL_CONFIG[toolName] ?? {
    cacheable: false,
    cacheTTL: 0,
    timeout: 30000,
  };

  logger.debug(
    { correlationId, toolName, args: tool.arguments },
    "Executing tool",
  );

  // Generate cache key
  const cacheKey = generateCacheKey(toolName, tool.arguments, shopId);

  // Check cache if enabled
  if (options?.useCache !== false && toolConfig.cacheable) {
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      logger.debug({ correlationId, toolName, cacheKey }, "Cache hit");
      metrics.toolCacheHits.inc({ tool: toolName });

      return {
        toolName,
        success: true,
        result: JSON.parse(cachedResult),
        executionTimeMs: Date.now() - startTime,
        cached: true,
        cacheKey,
      };
    }
  }

  // Check rate limit if configured
  if (toolConfig.rateLimit) {
    const rateLimitKey = `ratelimit:tool:${toolName}:${shopId}`;
    const current = await redis.incr(rateLimitKey);

    if (current === 1) {
      await redis.expire(rateLimitKey, toolConfig.rateLimit.window);
    }

    if (current > toolConfig.rateLimit.max) {
      throw new RateLimitError(`Rate limit exceeded for ${toolName}`, {
        limit: toolConfig.rateLimit.max,
        window: toolConfig.rateLimit.window,
        current,
      });
    }
  }

  // Execute tool
  try {
    const mcpClient = await getMCPClient(shopId);

    const toolResult = await Promise.race([
      executeTool(mcpClient, toolName, tool.arguments, {
        shopId,
        negotiationId,
        leadId,
      }),
      timeout(options?.timeout ?? toolConfig.timeout),
    ]);

    // Cache result if cacheable
    if (toolConfig.cacheable && options?.useCache !== false) {
      const ttl = options?.cacheTTL ?? toolConfig.cacheTTL;
      await redis.setex(cacheKey, ttl, JSON.stringify(toolResult));
      logger.debug({ correlationId, toolName, cacheKey, ttl }, "Result cached");
    }

    const result: ToolExecuteResult = {
      toolName,
      success: true,
      result: toolResult,
      executionTimeMs: Date.now() - startTime,
      cached: false,
      cacheKey: toolConfig.cacheable ? cacheKey : undefined,
      metadata: {
        mcpServerLatency: toolResult._latency,
        externalApiCalls: toolResult._apiCalls,
      },
    };

    // Metrics
    metrics.toolCallsTotal.inc({ tool: toolName, status: "success" });
    metrics.toolCallDuration.observe(
      { tool: toolName },
      result.executionTimeMs,
    );

    logger.info(
      {
        correlationId,
        toolName,
        executionTime: result.executionTimeMs,
      },
      "Tool executed successfully",
    );

    return result;
  } catch (error: any) {
    const isRetryable = isRetryableError(error);

    const result: ToolExecuteResult = {
      toolName,
      success: false,
      result: null,
      executionTimeMs: Date.now() - startTime,
      cached: false,
      error: {
        code: error.code ?? "TOOL_ERROR",
        message: error.message,
        retryable: isRetryable,
        details: error.details,
      },
    };

    metrics.toolCallsTotal.inc({ tool: toolName, status: "error" });

    logger.error(
      {
        correlationId,
        toolName,
        error: error.message,
        retryable: isRetryable,
      },
      "Tool execution failed",
    );

    if (isRetryable) {
      throw error; // Let BullMQ retry
    }

    return result;
  }
}

async function executeTool(
  mcpClient: MCPClient,
  toolName: string,
  args: Record<string, any>,
  context: { shopId: string; negotiationId?: string; leadId?: string },
): Promise<any> {
  // Route based on tool type
  if (toolName.startsWith("get_") || toolName === "search_products") {
    // Read operations
    return await mcpClient.callTool(toolName, {
      ...args,
      shopId: context.shopId,
    });
  } else {
    // Write operations - include full context
    return await mcpClient.callTool(toolName, {
      ...args,
      shopId: context.shopId,
      negotiationId: context.negotiationId,
      leadId: context.leadId,
    });
  }
}

function generateCacheKey(
  toolName: string,
  args: Record<string, any>,
  shopId: string,
): string {
  const sortedArgs = Object.keys(args)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = args[key];
        return acc;
      },
      {} as Record<string, any>,
    );

  const hash = createHash("md5")
    .update(JSON.stringify({ toolName, args: sortedArgs, shopId }))
    .digest("hex");

  return `tool:cache:${toolName}:${hash}`;
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new TimeoutError(`Tool execution timed out after ${ms}ms`)),
      ms,
    );
  });
}

function isRetryableError(error: any): boolean {
  const retryableCodes = [
    "ETIMEDOUT",
    "ECONNRESET",
    "ENOTFOUND",
    "RATE_LIMIT",
    "SERVICE_UNAVAILABLE",
  ];
  return retryableCodes.includes(error.code) || error.statusCode >= 500;
}

class RateLimitError extends Error {
  code = "RATE_LIMIT";
  constructor(
    message: string,
    public details: any,
  ) {
    super(message);
  }
}

class TimeoutError extends Error {
  code = "TIMEOUT";
  constructor(message: string) {
    super(message);
  }
}

// Worker factory
export function createToolExecuteWorker(redis: Redis): Worker {
  const logger = createLogger("ai:tool:execute");

  return new Worker(
    "ai:tool:execute",
    async (job) => toolExecuteProcessor(job, logger, redis),
    {
      connection: redis,
      concurrency: 200,
    },
  );
}

// Cleanup MCP clients on shutdown
export async function cleanupMCPClients(): Promise<void> {
  for (const [shopId, client] of mcpClientPool) {
    await client.close();
  }
  mcpClientPool.clear();
}
```

---
