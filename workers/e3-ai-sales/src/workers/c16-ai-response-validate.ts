/**
 * C16 — ai:response:validate (concurrency:20, timeout:30s) CRITICAL
 *
 * Rulează guardrails M71-M75 în paralel via lib/guardrails.ts:
 *  - M71: Price Guardrail — preț AI vs gold_products.unit_price
 *  - M72: Stock Guardrail — afirmații stoc vs get_available_stock(sku)
 *  - M73: Discount Guardrail — discount AI vs get_max_discount + margin ≥8%
 *  - M74: SKU Guardrail — SKU-uri AI existente în catalog
 *  - M75: Fiscal Guardrail — CUI modulo 11, TVA rate, totale aritmetice
 *
 * Pass: enqueue C17 ai:conversation:store cu validated=true
 * Fail + attemptCount < 3: enqueue C18 ai:retry:regenerate
 * Fail + attemptCount >= 3: enqueue hitl:escalate (N76)
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, guardrailViolations } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";
import {
  runPriceCheck,
  runStockCheck,
  runDiscountCheck,
  runSkuValidate,
  runFiscalValidate,
} from "../lib/guardrails.js";

const LOG = "[c16:ai:response:validate]";
const MAX_RETRY_ATTEMPTS = 3;

// ── Job types ─────────────────────────────────────────────────────────────────

export interface AiResponseValidateJobData {
  tenantId: string;
  sessionId: string;
  conversationId: string | null;
  negotiationId: string;
  response: string;
  attemptCount?: number;
}

/** Tip compatibil cu testele existente care folosesc obiectul simplu `{ passed, violation }` */
export interface GuardrailResult {
  passed: boolean;
  violation?: string;
}

// ── Guardrail registry — exportat pentru injectare în teste ──────────────────
//
// Fiecare cheie poate fi suprascrisă cu vi.fn() în teste fără a modifica
// implementarea procesorului. Semnăturile acceptă (tenantId, response, negotiationId)
// pentru consistență cu apelurile din procesor.

export const guardrailRegistry: {
  checkPrice: (
    tenantId: string,
    response: string,
    negotiationId: string,
  ) => Promise<GuardrailResult>;
  checkStock: (
    tenantId: string,
    response: string,
    negotiationId: string,
  ) => Promise<GuardrailResult>;
  checkDiscount: (
    tenantId: string,
    response: string,
    negotiationId: string,
  ) => Promise<GuardrailResult>;
  checkSku: (tenantId: string, response: string, negotiationId: string) => Promise<GuardrailResult>;
  checkFiscal: (response: string) => Promise<GuardrailResult>;
} = {
  checkPrice: (tenantId, response, negotiationId) =>
    runPriceCheck({ tenantId, negotiationId, response }),
  checkStock: (tenantId, response, negotiationId) =>
    runStockCheck({ tenantId, negotiationId, response }),
  checkDiscount: (tenantId, response, negotiationId) =>
    runDiscountCheck({ tenantId, negotiationId, response }),
  checkSku: (tenantId, response, negotiationId) =>
    runSkuValidate({ tenantId, negotiationId, response }),
  checkFiscal: (response) => runFiscalValidate({ response }),
};

// ── Downstream queues ─────────────────────────────────────────────────────────

const storeQueue = createQueue(QUEUES.E3_AI_CONVERSATION_STORE);
const retryQueue = createQueue(QUEUES.E3_AI_RETRY_REGENERATE);
const hitlQueue = createQueue(QUEUES.HITL_ESCALATION);

// ── Processor ─────────────────────────────────────────────────────────────────

export const aiResponseValidateProcessor: Processor<AiResponseValidateJobData> = async (job) => {
  const {
    tenantId,
    sessionId,
    conversationId,
    negotiationId,
    response,
    attemptCount = 0,
  } = job.data;

  await setSessionTenantId(tenantId);

  console.info(`${LOG} tenantId=${tenantId} sessionId=${sessionId} attemptCount=${attemptCount}`);

  // 1. Rulează toate 5 guardrails M71-M75 în paralel
  const [priceResult, stockResult, discountResult, skuResult, fiscalResult] = await Promise.all([
    guardrailRegistry.checkPrice(tenantId, response, negotiationId),
    guardrailRegistry.checkStock(tenantId, response, negotiationId),
    guardrailRegistry.checkDiscount(tenantId, response, negotiationId),
    guardrailRegistry.checkSku(tenantId, response, negotiationId),
    guardrailRegistry.checkFiscal(response),
  ]);

  const results: Array<{ guardrail: string; result: GuardrailResult }> = [
    { guardrail: "price", result: priceResult },
    { guardrail: "stock", result: stockResult },
    { guardrail: "discount", result: discountResult },
    { guardrail: "sku", result: skuResult },
    { guardrail: "fiscal", result: fiscalResult },
  ];

  const violations = results
    .filter((r) => !r.result.passed)
    .map((r) => ({
      guardrail: r.guardrail,
      violation: r.result.violation ?? "unknown violation",
    }));

  const allPassed = violations.length === 0;

  if (allPassed) {
    // 2a. Toate pass — enqueue C17 cu validated=true
    await storeQueue.add(
      "ai:conversation:store",
      {
        tenantId,
        sessionId,
        conversationId,
        validated: true,
        negotiationId,
      },
      { ...DEFAULT_JOB_OPTIONS, jobId: `store:validated:${sessionId}:${Date.now()}` },
    );

    console.info(`${LOG} all guardrails PASSED sessionId=${sessionId}`);
  } else {
    // 2b. Cel puțin un fail — log violation în DB
    console.warn(
      `${LOG} guardrail FAIL sessionId=${sessionId} violations=${JSON.stringify(violations)}`,
    );

    for (const v of violations) {
      await db.insert(guardrailViolations).values({
        tenantId,
        nodeKey: `c16:${sessionId}`,
        violationType: v.guardrail,
        severity: "HIGH",
        details: {
          sessionId,
          conversationId,
          negotiationId,
          violation: v.violation,
          response: response.slice(0, 500),
        },
      });
    }

    if (attemptCount < MAX_RETRY_ATTEMPTS) {
      // Enqueue C18 retry (Correction → Regenerate)
      await retryQueue.add(
        "ai:retry:regenerate",
        {
          tenantId,
          sessionId,
          conversationId,
          negotiationId,
          leadId: null,
          originalUserMessage: null,
          violations,
          attemptNumber: attemptCount + 1,
        },
        { ...DEFAULT_JOB_OPTIONS, jobId: `retry:${sessionId}:${attemptCount + 1}` },
      );
      console.info(`${LOG} enqueued C18 retry attempt=${attemptCount + 1} sessionId=${sessionId}`);
    } else {
      // 3x FAIL → Escalate N76 HumanNeuron HITL
      await hitlQueue.add(
        "hitl:escalate",
        {
          discriminator: "guardrail-fail",
          sessionId,
          conversationId,
          negotiationId,
          tenantId,
          violations,
        },
        { ...DEFAULT_JOB_OPTIONS, jobId: `hitl:guardrail:${sessionId}` },
      );
      console.warn(
        `${LOG} escalated to HITL N76 after ${attemptCount} attempts sessionId=${sessionId}`,
      );
    }
  }

  return {
    ok: true,
    sessionId,
    passed: allPassed,
    violations,
  };
};

export type { GuardrailCheckResult } from "../lib/guardrails.js";
