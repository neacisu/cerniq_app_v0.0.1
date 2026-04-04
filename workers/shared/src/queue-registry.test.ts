import { describe, expect, it } from "vitest";
import {
  QUEUE_NAME_PATTERN,
  QUEUES,
  assertQueueRegistryComplete,
  getQueueConfig,
  isKnownQueueName,
  queueRegistry,
} from "./queue-registry.js";

describe("queue-registry", () => {
  it("contains the expected number of canonical queues", () => {
    expect(() => assertQueueRegistryComplete()).not.toThrow();
    // 60 Etapa 1 (D0 replaces D1-D5) + 52 Etapa 2 static + 40 Etapa 2 per-phone
    // + 12 E3 AI Sales (A+B) + 20 E3 (C+D+E) + 6 E3 Stock (F) + 7 E3 Oblio (G)
    // + 5 E3 eFactura (H) + 5 E3 Document (I) + 5 E3 Handover (J) + 5 E3 Sentiment (K)
    // + 5 E3 MCP (L) + 5 E3 Guardrails (M) + 3 E3 HITL (N) = 230
    // + 6 E4 Revolut Payments (A1-A6) = 236
    // + 6 E4 Reconciliere Plăți (B7-B12) = 242
    // + 11 E4 Credit Scoring 100p (C13-D21 + 2 cron) = 253
    // + 6 E4 Sameday AWB + Tracking (E22-E27) = 259
    // + 5 E4 Contracte DocuSign (G32-G36) = 264
    // + 4 E4 Stock Sync Oblio (F28-F31) = 268
    // + 2 E4 Returns (H37-H38) = 270
    // + 6 E4 AlertNeuron (I39-I44) = 276
    // + 3 E4 Audit Hash-Chain (J45-J47) = 279
    // + 6 E4 HITL (K48-K53) = 285
    // + 8 E5 Nurturing FSM (A1-A8) = 293
    // + 6 E5 Churn Detection B9-B14 = 299
    // + 5 E5 PostGIS Proximity C15-C19 = 304
    // … E5 graph, referral, feedback, win-back, association, NPS, drip, alerts, compliance, HITL
    // + ai:response:generate (E2 outreach) — vezi `assertQueueRegistryComplete` (expected = 346).
    expect(queueRegistry).toHaveLength(346);
  });

  it("uses canonical colon-based queue names", () => {
    for (const queue of queueRegistry) {
      expect(queue.name).toMatch(QUEUE_NAME_PATTERN);
      expect(queue.name.includes(".")).toBe(false);
    }
  });

  it("validates known queues and rejects unknown ones", () => {
    expect(isKnownQueueName(QUEUES.PIPELINE_ORCHESTRATE)).toBe(true);
    expect(isKnownQueueName("pipeline:unknown")).toBe(false);
  });

  it("returns queue configuration for known queues", () => {
    expect(getQueueConfig(QUEUES.PIPELINE_ORCHESTRATE)).toMatchObject({
      name: QUEUES.PIPELINE_ORCHESTRATE,
      concurrency: expect.any(Number),
    });
    expect(getQueueConfig("pipeline:unknown")).toBeUndefined();
  });

  it("throws when the registry inventory is incomplete", () => {
    const removed = queueRegistry.pop();
    try {
      expect(() => assertQueueRegistryComplete()).toThrow("Expected 346 queues");
    } finally {
      if (removed) queueRegistry.push(removed);
    }
  });

  it("contains all 6 E4 Revolut queues (FAZA 8b A1-A6)", () => {
    const e4Queues = [
      QUEUES.E4_REVOLUT_WEBHOOK_INGEST,
      QUEUES.E4_REVOLUT_TRANSACTION_PROCESS,
      QUEUES.E4_REVOLUT_PAYMENT_RECORD,
      QUEUES.E4_REVOLUT_REFUND_PROCESS,
      QUEUES.E4_REVOLUT_BALANCE_SYNC,
      QUEUES.E4_REVOLUT_WEBHOOK_VALIDATE,
    ];
    for (const name of e4Queues) {
      expect(isKnownQueueName(name)).toBe(true);
      const config = getQueueConfig(name);
      expect(config).toBeDefined();
      expect(config?.concurrency).toBeGreaterThan(0);
    }
  });

  it("E4 webhook queues have rate limit 100 req/min", () => {
    const ingestConfig = getQueueConfig(QUEUES.E4_REVOLUT_WEBHOOK_INGEST);
    const validateConfig = getQueueConfig(QUEUES.E4_REVOLUT_WEBHOOK_VALIDATE);
    expect(ingestConfig?.rateLimit).toEqual({ max: 100, duration: 60_000 });
    expect(validateConfig?.rateLimit).toEqual({ max: 100, duration: 60_000 });
  });

  it("E4 balance sync has concurrency=1 (cron job)", () => {
    const config = getQueueConfig(QUEUES.E4_REVOLUT_BALANCE_SYNC);
    expect(config?.concurrency).toBe(1);
  });

  it("contains all 6 E4 Reconciliere Plăți queues (FAZA 8c B7-B12)", () => {
    const bQueues = [
      QUEUES.E4_PAYMENT_RECONCILE_AUTO,
      QUEUES.E4_PAYMENT_RECONCILE_FUZZY,
      QUEUES.E4_PAYMENT_RECONCILE_MANUAL,
      QUEUES.E4_PAYMENT_BALANCE_UPDATE,
      QUEUES.E4_PAYMENT_OVERDUE_DETECT,
      QUEUES.E4_PAYMENT_OVERDUE_ESCALATE,
    ];
    for (const name of bQueues) {
      expect(isKnownQueueName(name)).toBe(true);
      const config = getQueueConfig(name);
      expect(config).toBeDefined();
      expect(config?.concurrency).toBeGreaterThan(0);
    }
  });

  it("B11 overdue detect are concurrency=1 (cron singleton)", () => {
    const config = getQueueConfig(QUEUES.E4_PAYMENT_OVERDUE_DETECT);
    expect(config?.concurrency).toBe(1);
  });

  it("B9 manual reconciliere are concurrency=5 (HITL limited)", () => {
    const config = getQueueConfig(QUEUES.E4_PAYMENT_RECONCILE_MANUAL);
    expect(config?.concurrency).toBe(5);
  });

  it("contains all 11 E4 Credit Scoring queues (FAZA 8d C13-D21 + 2 cron)", () => {
    const creditQueues = [
      QUEUES.E4_CREDIT_PROFILE_CREATE,
      QUEUES.E4_CREDIT_DATA_FETCH_ANAF,
      QUEUES.E4_CREDIT_DATA_FETCH_BILANT,
      QUEUES.E4_CREDIT_DATA_FETCH_BPI,
      QUEUES.E4_CREDIT_SCORE_CALCULATE,
      QUEUES.E4_CREDIT_LIMIT_CALCULATE,
      QUEUES.E4_CREDIT_LIMIT_CHECK,
      QUEUES.E4_CREDIT_LIMIT_RESERVE,
      QUEUES.E4_CREDIT_LIMIT_RELEASE,
      QUEUES.E4_CREDIT_REFRESH_ALL,
      QUEUES.E4_RESERVATION_EXPIRE,
    ];
    for (const name of creditQueues) {
      expect(isKnownQueueName(name)).toBe(true);
      const config = getQueueConfig(name);
      expect(config).toBeDefined();
      expect(config?.concurrency).toBeGreaterThan(0);
    }
  });

  it("C14/C15/C16 ANAF+Bilant+BPI fetch workers have concurrency=5", () => {
    expect(getQueueConfig(QUEUES.E4_CREDIT_DATA_FETCH_ANAF)?.concurrency).toBe(5);
    expect(getQueueConfig(QUEUES.E4_CREDIT_DATA_FETCH_BILANT)?.concurrency).toBe(5);
    expect(getQueueConfig(QUEUES.E4_CREDIT_DATA_FETCH_BPI)?.concurrency).toBe(5);
  });

  it("D19 credit:limit:check has concurrency=20 (CRITICAL path)", () => {
    const config = getQueueConfig(QUEUES.E4_CREDIT_LIMIT_CHECK);
    expect(config?.concurrency).toBe(20);
  });

  it("Credit cron queues have concurrency=1 (singleton)", () => {
    expect(getQueueConfig(QUEUES.E4_CREDIT_REFRESH_ALL)?.concurrency).toBe(1);
    expect(getQueueConfig(QUEUES.E4_RESERVATION_EXPIRE)?.concurrency).toBe(1);
  });

  it("all E4 credit queue names follow colon pattern", () => {
    const creditQueues = [
      "credit:profile:create",
      "credit:data:fetch-anaf",
      "credit:data:fetch-bilant",
      "credit:data:fetch-bpi",
      "credit:score:calculate",
      "credit:limit:calculate",
      "credit:limit:check",
      "credit:limit:reserve",
      "credit:limit:release",
      "pipeline:credit:refresh-all",
      "pipeline:reservation:expire",
    ];
    for (const name of creditQueues) {
      expect(QUEUE_NAME_PATTERN.test(name)).toBe(true);
      expect(isKnownQueueName(name)).toBe(true);
    }
  });

  it("contains all 6 E4 Sameday AWB + Tracking queues (FAZA 8e E22-E27)", () => {
    const samedayQueues = [
      QUEUES.E4_SAMEDAY_AWB_CREATE,
      QUEUES.E4_SAMEDAY_STATUS_POLL,
      QUEUES.E4_SAMEDAY_STATUS_PROCESS,
      QUEUES.E4_SAMEDAY_COD_PROCESS,
      QUEUES.E4_SAMEDAY_RETURN_INITIATE,
      QUEUES.E4_SAMEDAY_PICKUP_SCHEDULE,
    ];
    for (const name of samedayQueues) {
      expect(isKnownQueueName(name)).toBe(true);
      const config = getQueueConfig(name);
      expect(config).toBeDefined();
      expect(config?.concurrency).toBeGreaterThan(0);
    }
  });

  it("E22 AWB create has rate limit 30 req/min (Sameday API)", () => {
    const config = getQueueConfig(QUEUES.E4_SAMEDAY_AWB_CREATE);
    expect(config?.rateLimit).toEqual({ max: 30, duration: 60_000 });
  });

  it("E23 status:poll and E27 pickup:schedule are singleton cron (concurrency=1)", () => {
    expect(getQueueConfig(QUEUES.E4_SAMEDAY_STATUS_POLL)?.concurrency).toBe(1);
    expect(getQueueConfig(QUEUES.E4_SAMEDAY_PICKUP_SCHEDULE)?.concurrency).toBe(1);
  });

  it("E24 status:process has concurrency=10 (lightweight DB updates)", () => {
    const config = getQueueConfig(QUEUES.E4_SAMEDAY_STATUS_PROCESS);
    expect(config?.concurrency).toBe(10);
  });

  it("all Sameday queue names follow colon pattern", () => {
    const samedayNames = [
      "sameday:awb:create",
      "sameday:status:poll",
      "sameday:status:process",
      "sameday:cod:process",
      "sameday:return:initiate",
      "sameday:pickup:schedule",
    ];
    for (const name of samedayNames) {
      expect(QUEUE_NAME_PATTERN.test(name)).toBe(true);
      expect(isKnownQueueName(name)).toBe(true);
    }
  });

  it("contains all 5 E4 Contracte DocuSign queues (FAZA 8f G32-G36)", () => {
    const contractQueues = [
      QUEUES.E4_CONTRACT_GENERATE,
      QUEUES.E4_CONTRACT_CLAUSES_SELECT,
      QUEUES.E4_CONTRACT_DOCUSIGN_SEND,
      QUEUES.E4_CONTRACT_STATUS_POLL,
      QUEUES.E4_CONTRACT_SIGNED_PROCESS,
    ];
    for (const name of contractQueues) {
      expect(isKnownQueueName(name)).toBe(true);
      const config = getQueueConfig(name);
      expect(config).toBeDefined();
      expect(config?.concurrency).toBeGreaterThan(0);
    }
  });

  it("G34 contract:docusign:send has rate limit 15 req/min (DocuSign API)", () => {
    const config = getQueueConfig(QUEUES.E4_CONTRACT_DOCUSIGN_SEND);
    expect(config?.rateLimit).toEqual({ max: 15, duration: 60_000 });
  });

  it("G35 contract:status:poll is singleton cron (concurrency=1)", () => {
    expect(getQueueConfig(QUEUES.E4_CONTRACT_STATUS_POLL)?.concurrency).toBe(1);
  });

  it("G32 contract:generate has concurrency=3 (LibreOffice CPU intensive)", () => {
    expect(getQueueConfig(QUEUES.E4_CONTRACT_GENERATE)?.concurrency).toBe(3);
  });

  it("all DocuSign contract queue names follow colon pattern", () => {
    const contractNames = [
      "contract:generate",
      "contract:clauses:select",
      "contract:docusign:send",
      "contract:status:poll",
      "contract:signed:process",
    ];
    for (const name of contractNames) {
      expect(QUEUE_NAME_PATTERN.test(name)).toBe(true);
      expect(isKnownQueueName(name)).toBe(true);
    }
  });

  it("contains all 4 E4 Stock Sync Oblio queues (FAZA 8g F28-F31)", () => {
    const stockQueues = [
      QUEUES.E4_STOCK_SYNC_OBLIO,
      QUEUES.E4_STOCK_DEDUCT,
      QUEUES.E4_STOCK_RETURN,
      QUEUES.E4_STOCK_LOW_ALERT,
    ];
    for (const name of stockQueues) {
      expect(isKnownQueueName(name)).toBe(true);
      const config = getQueueConfig(name);
      expect(config).toBeDefined();
      expect(config?.concurrency).toBeGreaterThan(0);
    }
  });

  it("F29 stock:deduct has concurrency=10 (high throughput DELIVERED events)", () => {
    expect(getQueueConfig(QUEUES.E4_STOCK_DEDUCT)?.concurrency).toBe(10);
  });

  it("contains all 2 E4 Returns queues (FAZA 8g H37-H38)", () => {
    expect(isKnownQueueName(QUEUES.E4_RETURN_INITIATE)).toBe(true);
    expect(isKnownQueueName(QUEUES.E4_RETURN_PROCESS)).toBe(true);
    expect(getQueueConfig(QUEUES.E4_RETURN_INITIATE)?.concurrency).toBe(5);
    expect(getQueueConfig(QUEUES.E4_RETURN_PROCESS)?.concurrency).toBe(5);
  });

  it("contains all 6 E4 AlertNeuron queues (FAZA 8g I39-I44)", () => {
    const alertQueues = [
      QUEUES.E4_ALERT_PAYMENT,
      QUEUES.E4_ALERT_DELIVERY,
      QUEUES.E4_ALERT_CREDIT,
      QUEUES.E4_ALERT_CONTRACT,
      QUEUES.E4_ALERT_STOCK,
      QUEUES.E4_ALERT_DISPATCH,
    ];
    for (const name of alertQueues) {
      expect(isKnownQueueName(name)).toBe(true);
      const config = getQueueConfig(name);
      expect(config).toBeDefined();
      expect(config?.concurrency).toBe(10);
    }
  });

  it("contains all 3 E4 Audit Hash-Chain queues (FAZA 8g J45-J47)", () => {
    expect(isKnownQueueName(QUEUES.E4_AUDIT_LOG_WRITE)).toBe(true);
    expect(isKnownQueueName(QUEUES.E4_AUDIT_CHAIN_VERIFY)).toBe(true);
    expect(isKnownQueueName(QUEUES.E4_AUDIT_DATA_ANONYMIZE)).toBe(true);
  });

  it("J45 audit:log:write has concurrency=1 (CRITICAL: hash chain serialization)", () => {
    expect(getQueueConfig(QUEUES.E4_AUDIT_LOG_WRITE)?.concurrency).toBe(1);
  });

  it("J46 audit:chain:verify and J47 audit:data:anonymize are singleton cron (concurrency=1)", () => {
    expect(getQueueConfig(QUEUES.E4_AUDIT_CHAIN_VERIFY)?.concurrency).toBe(1);
    expect(getQueueConfig(QUEUES.E4_AUDIT_DATA_ANONYMIZE)?.concurrency).toBe(1);
  });

  it("contains all 6 E4 HITL queues (FAZA 8g K48-K53)", () => {
    const hitlQueues = [
      QUEUES.E4_HITL_CREDIT_OVERRIDE,
      QUEUES.E4_HITL_CREDIT_LIMIT,
      QUEUES.E4_HITL_REFUND_LARGE,
      QUEUES.E4_HITL_PAYMENT_INVESTIGATION,
      QUEUES.E4_HITL_TASK_RESOLVE,
      QUEUES.E4_HITL_ESCALATION_OVERDUE,
    ];
    for (const name of hitlQueues) {
      expect(isKnownQueueName(name)).toBe(true);
      const config = getQueueConfig(name);
      expect(config).toBeDefined();
      expect(config?.concurrency).toBe(5);
    }
  });

  it("all FAZA 8g queue names follow colon pattern", () => {
    const faza8gNames = [
      "stock:sync:oblio",
      "stock:deduct",
      "stock:return",
      "stock:low:alert",
      "return:initiate",
      "return:process",
      "alert:payment",
      "alert:delivery",
      "alert:credit",
      "alert:contract",
      "alert:stock",
      "alert:dispatch",
      "audit:log:write",
      "audit:chain:verify",
      "audit:data:anonymize",
      "hitl:approval:credit-override",
      "hitl:approval:credit-limit",
      "hitl:approval:refund-large",
      "hitl:investigation:payment",
      "hitl:task:resolve",
      "hitl:escalation:overdue",
    ];
    for (const name of faza8gNames) {
      expect(QUEUE_NAME_PATTERN.test(name)).toBe(true);
      expect(isKnownQueueName(name)).toBe(true);
    }
  });
});
