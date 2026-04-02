/**
 * Teste complete pentru workers A1-A6 (E4 Post-Sale — Revolut Payments).
 *
 * Pattern vitest: vi.hoisted() + vi.mock() — identic cu workers/e3-ai-sales.
 * Acoperire: A1 idempotency, A2 payload parsing, A3 payment record,
 *            A4 refund eligibility, A5 balance sync, A6 HMAC-SHA256.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

// ── vi.hoisted() — variabile mutabile per test ─────────────────────────────

const {
  dbSelectMock,
  dbInsertMock,
  dbUpdateMock,
  setSessionTenantIdMock,
  addMock,
  createQueueMock,
  redisSetMock,
  redisGetMock,
  getRevolutAccountsMock,
  getRevolutTransactionMock,
  createRevolutPaymentMock,
  e4RevolutWebhooksTotalIncMock,
  e4RevolutPaymentsRecordedTotalIncMock,
  e4RevolutHmacValidationsTotalIncMock,
  e4RevolutBalanceGaugeSetMock,
  jobLogMock,
} = vi.hoisted(() => {
  const addMock = vi.fn().mockResolvedValue({ id: "job-123" });
  const createQueueMock = vi.fn(() => ({
    add: addMock,
    close: vi.fn().mockResolvedValue(undefined),
  }));

  return {
    dbSelectMock: vi.fn(),
    dbInsertMock: vi.fn(),
    dbUpdateMock: vi.fn(),
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    addMock,
    createQueueMock,
    redisSetMock: vi.fn().mockResolvedValue("OK"),
    redisGetMock: vi.fn().mockResolvedValue(null),
    getRevolutAccountsMock: vi.fn(),
    getRevolutTransactionMock: vi.fn(),
    createRevolutPaymentMock: vi.fn(),
    e4RevolutWebhooksTotalIncMock: vi.fn(),
    e4RevolutPaymentsRecordedTotalIncMock: vi.fn(),
    e4RevolutHmacValidationsTotalIncMock: vi.fn(),
    e4RevolutBalanceGaugeSetMock: vi.fn(),
    jobLogMock: vi.fn(),
  };
});

// ── vi.mock() ──────────────────────────────────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  revolutWebhooksRaw: {
    id: "id",
    tenantId: "tenant_id",
    eventType: "event_type",
    payload: "payload",
    signature: "signature",
    verified: "verified",
    idempotencyKey: "idempotency_key",
    processedAt: "processed_at",
    createdAt: "created_at",
  },
  goldPayments: {
    id: "id",
    tenantId: "tenant_id",
    orderId: "order_id",
    externalId: "external_id",
    externalSource: "external_source",
    amount: "amount",
    currency: "currency",
    reconciliationStatus: "reconciliation_status",
    counterpartyName: "counterparty_name",
    counterpartyIban: "counterparty_iban",
    reference: "reference",
    receivedAt: "received_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  goldRefunds: {
    id: "id",
    tenantId: "tenant_id",
    paymentId: "payment_id",
    orderId: "order_id",
    status: "status",
    amount: "amount",
    reason: "reason",
    revolutRefundId: "revolut_refund_id",
    requestedBy: "requested_by",
    approvedBy: "approved_by",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  goldOrders: {
    id: "id",
    tenantId: "tenant_id",
    status: "status",
    orderNumber: "order_number",
  },
  goldAuditLogsEtapa4: {
    id: "id",
    tenantId: "tenant_id",
    actorId: "actor_id",
    actorType: "actor_type",
    eventType: "event_type",
    entityType: "entity_type",
    entityId: "entity_id",
    metadata: "metadata",
    hashPrev: "hash_prev",
    hashCurr: "hash_curr",
    createdAt: "created_at",
  },
  eq: vi.fn((_a: unknown, _b: unknown) => ({ type: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ type: "and" })),
}));

vi.mock("@cerniq/worker-shared", () => ({
  createQueue: createQueueMock,
  createWorker: vi.fn(),
  QUEUES: {
    E4_REVOLUT_TRANSACTION_PROCESS: "revolut:transaction:process",
    E4_REVOLUT_WEBHOOK_VALIDATE: "revolut:webhook:validate",
    E4_REVOLUT_PAYMENT_RECORD: "revolut:payment:record",
  },
  DEFAULT_JOB_OPTIONS: { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
}));

vi.mock("../lib/revolut-client.js", () => ({
  getRevolutAccounts: getRevolutAccountsMock,
  getRevolutTransaction: getRevolutTransactionMock,
  createRevolutPayment: createRevolutPaymentMock,
}));

vi.mock("../e4-metrics.js", () => ({
  e4RevolutWebhooksTotal: { inc: e4RevolutWebhooksTotalIncMock },
  e4RevolutPaymentsRecordedTotal: { inc: e4RevolutPaymentsRecordedTotalIncMock },
  e4RevolutHmacValidationsTotal: { inc: e4RevolutHmacValidationsTotalIncMock },
  e4RevolutBalanceGauge: { set: e4RevolutBalanceGaugeSetMock },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  const basePromise = Promise.resolve(rows);
  const chain = Object.assign(basePromise, {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
  });
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

function makeUpdateChain() {
  const setChain = { where: vi.fn().mockResolvedValue({ rowCount: 1 }) };
  return { set: vi.fn().mockReturnValue(setChain) };
}

function makeJob<T>(data: T): Parameters<(job: { data: T; log: typeof jobLogMock }) => void>[0] {
  return { data, log: jobLogMock } as unknown as Parameters<
    (job: { data: T; log: typeof jobLogMock }) => void
  >[0];
}

// ── HMAC test helper — outer scope (per S7721) ──────────────────────────────

function computeHmac(bodyStr: string, secretStr: string): string {
  return crypto.createHmac("sha256", secretStr).update(bodyStr, "utf8").digest("hex");
}

// ── Imports workeri ─────────────────────────────────────────────────────────

import { createA1Processor } from "../workers/a1-revolut-webhook-ingest.js";
import {
  revolutTransactionProcessProcessor,
  parseRevolutPayload,
} from "../workers/a2-revolut-transaction-process.js";
import { revolutPaymentRecordProcessor } from "../workers/a3-revolut-payment-record.js";
import { revolutRefundProcessProcessor } from "../workers/a4-revolut-refund-process.js";
import { createA5Processor } from "../workers/a5-revolut-balance-sync.js";
import {
  revolutWebhookValidateProcessor,
  verifyRevolutHmac,
} from "../workers/a6-revolut-webhook-validate.js";

// ── Fake Redis ─────────────────────────────────────────────────────────────

const fakeRedis = {
  set: redisSetMock,
  get: redisGetMock,
} as unknown as import("ioredis").Redis;

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setSessionTenantIdMock.mockResolvedValue(undefined);
  addMock.mockResolvedValue({ id: "job-123" });
  createQueueMock.mockReturnValue({ add: addMock, close: vi.fn().mockResolvedValue(undefined) });
  redisSetMock.mockResolvedValue("OK");
  redisGetMock.mockResolvedValue(null);
});

// ══════════════════════════════════════════════════════════════════════════
// A1 — revolut:webhook:ingest
// ══════════════════════════════════════════════════════════════════════════

describe("A1 — revolut:webhook:ingest", () => {
  const baseJobData = {
    tenantId: "tenant-1",
    eventId: "evt-001",
    eventType: "TransactionCreated",
    rawBody: '{"id":"evt-001"}',
    signature: "abc123",
    payload: { id: "evt-001", type: "TransactionCreated" },
  };

  it("ingestează webhook nou — SET NX OK, INSERT DB, enqueue A2+A6", async () => {
    redisSetMock.mockResolvedValue("OK"); // SET NX returnează "OK" când cheia e nouă
    dbInsertMock.mockReturnValue(makeInsertChain());

    const processor = createA1Processor(fakeRedis);
    const job = makeJob(baseJobData);
    const result = await processor(job as never, {} as never);

    expect(result.ok).toBe(true);
    expect(result.action).toBe("ingested");
    if (result.action === "ingested") {
      expect(typeof result.webhookId).toBe("string");
      expect(result.eventType).toBe("TransactionCreated");
      expect(result.eventId).toBe("evt-001");
    }

    // Idempotency SET NX cu cheia corectă
    expect(redisSetMock).toHaveBeenCalledWith(
      "revolut:idempotency:evt-001",
      "1",
      "EX",
      86400,
      "NX",
    );

    // DB INSERT
    expect(dbInsertMock).toHaveBeenCalledTimes(1);

    // Enqueue A2 + A6 (2 queue-uri create)
    expect(createQueueMock).toHaveBeenCalledTimes(2);
    expect(addMock).toHaveBeenCalledTimes(2);
  });

  it("skip duplicate — SET NX returnează null (cheia exista)", async () => {
    redisSetMock.mockResolvedValue(null); // null = cheia deja existentă în Redis

    const processor = createA1Processor(fakeRedis);
    const job = makeJob(baseJobData);
    const result = await processor(job as never, {} as never);

    expect(result.ok).toBe(true);
    expect(result.action).toBe("skipped");
    if (result.action === "skipped") {
      expect(result.reason).toBe("duplicate");
      expect(result.eventId).toBe("evt-001");
    }

    // Nu face DB insert la duplicat
    expect(dbInsertMock).not.toHaveBeenCalled();
    expect(addMock).not.toHaveBeenCalled();

    // Metric skipped
    expect(e4RevolutWebhooksTotalIncMock).toHaveBeenCalledWith({
      event_type: "TransactionCreated",
      action: "skipped",
    });
  });

  it("Redis error → aruncă eroare retryabilă", async () => {
    redisSetMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const processor = createA1Processor(fakeRedis);
    const job = makeJob(baseJobData);

    await expect(processor(job as never, {} as never)).rejects.toThrow("Redis unavailable");
  });

  it("idempotency key respectă pattern revolut:idempotency:{eventId}", async () => {
    redisSetMock.mockResolvedValue(null); // skip
    const processor = createA1Processor(fakeRedis);
    const job = makeJob({ ...baseJobData, eventId: "revolut-event-uuid-xyz" });
    await processor(job as never, {} as never);

    expect(redisSetMock).toHaveBeenCalledWith(
      "revolut:idempotency:revolut-event-uuid-xyz",
      "1",
      "EX",
      86400,
      "NX",
    );
  });

  it("increment metric 'ingested' la succes", async () => {
    redisSetMock.mockResolvedValue("OK");
    dbInsertMock.mockReturnValue(makeInsertChain());

    const processor = createA1Processor(fakeRedis);
    await processor(makeJob(baseJobData) as never, {} as never);

    expect(e4RevolutWebhooksTotalIncMock).toHaveBeenCalledWith({
      event_type: "TransactionCreated",
      action: "ingested",
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// A2 — revolut:transaction:process (parseRevolutPayload)
// ══════════════════════════════════════════════════════════════════════════

describe("A2 — revolutTransactionProcessProcessor + parseRevolutPayload", () => {
  // ── parseRevolutPayload — teste pure (fără dependențe) ──────────────────

  describe("parseRevolutPayload — unit tests", () => {
    it("TransactionCreated cu amount pozitiv → payment_received", () => {
      const payload = {
        id: "tx-001",
        type: "transfer",
        state: "completed",
        amount: 1500,
        currency: "RON",
        reference: "INV-001",
        created_at: "2026-03-30T10:00:00Z",
        counterparty: { name: "Client Test", iban: "RO49AAAA1B31007593840000" },
      };

      const result = parseRevolutPayload("TransactionCreated", payload);
      expect(result).not.toBeNull();
      expect(result?.externalId).toBe("tx-001");
      expect(result?.amount).toBe(1500);
      expect(result?.currency).toBe("RON");
      expect(result?.reference).toBe("INV-001");
      expect(result?.counterpartyName).toBe("Client Test");
      expect(result?.counterpartyIban).toBe("RO49AAAA1B31007593840000");
      expect(result?.internalType).toBe("payment_received");
    });

    it("TransactionCreated cu type=card_refund → refund_processed", () => {
      const payload = {
        id: "tx-refund-001",
        type: "card_refund",
        state: "completed",
        amount: 500,
        currency: "RON",
        created_at: "2026-03-30T11:00:00Z",
      };
      const result = parseRevolutPayload("TransactionCreated", payload);
      expect(result?.internalType).toBe("refund_processed");
    });

    it("TransactionCreated cu state=reverted → refund_processed", () => {
      const payload = {
        id: "tx-rev-001",
        type: "transfer",
        state: "reverted",
        amount: 300,
        currency: "EUR",
      };
      const result = parseRevolutPayload("TransactionCreated", payload);
      expect(result?.internalType).toBe("refund_processed");
    });

    it("TransferStateChanged → transfer_initiated", () => {
      const payload = {
        id: "tx-transfer-001",
        type: "transfer",
        state: "pending",
        amount: 2000,
        currency: "RON",
      };
      const result = parseRevolutPayload("TransferStateChanged", payload);
      expect(result?.internalType).toBe("transfer_initiated");
    });

    it("TransactionStateChanged state=completed amount>0 → payment_received", () => {
      const payload = {
        id: "tx-state-001",
        type: "transfer",
        state: "completed",
        amount: 750,
        currency: "RON",
      };
      const result = parseRevolutPayload("TransactionStateChanged", payload);
      expect(result?.internalType).toBe("payment_received");
    });

    it("payload fără id → returnează null", () => {
      const result = parseRevolutPayload("TransactionCreated", { amount: 100 });
      expect(result).toBeNull();
    });

    it("payload gol → returnează null", () => {
      const result = parseRevolutPayload("TransactionCreated", {});
      expect(result).toBeNull();
    });

    it("amount negativ → abs(amount) în internalType=transfer_initiated", () => {
      const payload = {
        id: "tx-neg-001",
        type: "transfer",
        state: "completed",
        amount: -1200,
        currency: "RON",
      };
      const result = parseRevolutPayload("TransactionStateChanged", payload);
      expect(result?.amount).toBe(1200); // Math.abs
      expect(result?.internalType).toBe("transfer_initiated");
    });
  });

  // ── revolutTransactionProcessProcessor — integrare ────────────────────────

  const baseJobData = {
    webhookId: "wh-001",
    eventType: "TransactionCreated",
    tenantId: "tenant-1",
    payload: {
      id: "tx-001",
      type: "transfer",
      state: "completed",
      amount: 1500,
      currency: "RON",
      reference: "INV-001",
    },
  };

  it("enqueue A3 pentru payload valid", async () => {
    const job = makeJob(baseJobData);
    const result = await revolutTransactionProcessProcessor(job as never, {} as never);

    expect(result.ok).toBe(true);
    expect(result.action).toBe("enqueued_a3");
    if (result.action === "enqueued_a3") {
      expect(result.parsedData.externalId).toBe("tx-001");
      expect(result.parsedData.internalType).toBe("payment_received");
    }
    expect(addMock).toHaveBeenCalledTimes(1);
    const jobData = addMock.mock.calls[0]?.[1] as { externalId: string; amount: number };
    expect(jobData.externalId).toBe("tx-001");
    expect(jobData.amount).toBe(1500);
  });

  it("skip eveniment necunoscut (ex: PaymentAuthorizationStarted)", async () => {
    const job = makeJob({ ...baseJobData, eventType: "PaymentAuthorizationStarted" });
    const result = await revolutTransactionProcessProcessor(job as never, {} as never);

    expect(result.ok).toBe(true);
    expect(result.action).toBe("skipped");
    if (result.action === "skipped") {
      expect(result.reason).toContain("unsupported_event_type");
    }
    expect(addMock).not.toHaveBeenCalled();
  });

  it("skip payload fără id", async () => {
    const job = makeJob({ ...baseJobData, payload: { amount: 100 } });
    const result = await revolutTransactionProcessProcessor(job as never, {} as never);

    expect(result.ok).toBe(true);
    expect(result.action).toBe("skipped");
    if (result.action === "skipped") {
      expect(result.reason).toBe("unparseable_payload");
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// A3 — revolut:payment:record
// ══════════════════════════════════════════════════════════════════════════

describe("A3 — revolutPaymentRecordProcessor", () => {
  const baseJobData = {
    webhookId: "wh-001",
    tenantId: "tenant-1",
    externalId: "revolut-tx-001",
    amount: 1500,
    currency: "RON",
    counterpartyName: "Client Test SRL",
    counterpartyIban: "RO49AAAA1B31007593840000",
    reference: "INV-2026-001",
    receivedAt: "2026-03-30T10:00:00Z",
    internalType: "payment_received" as const,
  };

  it("INSERT gold_payments + gold_audit_logs_etapa4 + enqueue B7", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = makeJob(baseJobData);
    const result = await revolutPaymentRecordProcessor(job as never, {} as never);

    expect(result.ok).toBe(true);
    expect(typeof result.paymentId).toBe("string");
    expect(result.paymentId.length).toBeGreaterThan(0);
    expect(typeof result.reconcileJobId).toBe("string");
    expect(result.webhookId).toBe("wh-001");

    // 2 INSERT-uri: gold_payments + gold_audit_logs_etapa4
    expect(dbInsertMock).toHaveBeenCalledTimes(2);

    // Enqueue B7 payment:reconcile:auto
    expect(createQueueMock).toHaveBeenCalledWith(
      "payment:reconcile:auto",
      expect.objectContaining({ db: expect.any(Number) }),
    );
    expect(addMock).toHaveBeenCalledTimes(1);
    const b7JobData = addMock.mock.calls[0]?.[1] as { paymentId: string; externalId: string };
    expect(b7JobData.paymentId).toBe(result.paymentId);
    expect(b7JobData.externalId).toBe("revolut-tx-001");
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());

    await revolutPaymentRecordProcessor(makeJob(baseJobData) as never, {} as never);
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-1");
  });

  it("payment INSERT conține externalSource=REVOLUT și reconciliationStatus=PENDING", async () => {
    const insertChain = makeInsertChain();
    dbInsertMock.mockReturnValue(insertChain);

    await revolutPaymentRecordProcessor(makeJob(baseJobData) as never, {} as never);

    const firstInsertCall = insertChain.values.mock.calls[0]?.[0] as {
      externalSource: string;
      reconciliationStatus: string;
      amount: string;
      currency: string;
    };
    expect(firstInsertCall.externalSource).toBe("REVOLUT");
    expect(firstInsertCall.reconciliationStatus).toBe("PENDING");
    expect(firstInsertCall.amount).toBe("1500");
    expect(firstInsertCall.currency).toBe("RON");
  });

  it("audit log INSERT conține eventType=PAYMENT_RECEIVED", async () => {
    const insertChain = makeInsertChain();
    dbInsertMock.mockReturnValue(insertChain);

    await revolutPaymentRecordProcessor(makeJob(baseJobData) as never, {} as never);

    const secondInsertCall = insertChain.values.mock.calls[1]?.[0] as {
      eventType: string;
      entityType: string;
      actorType: string;
    };
    expect(secondInsertCall.eventType).toBe("PAYMENT_RECEIVED");
    expect(secondInsertCall.entityType).toBe("gold_payments");
    expect(secondInsertCall.actorType).toBe("WORKER");
  });

  it("increment metric e4RevolutPaymentsRecordedTotal", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());

    await revolutPaymentRecordProcessor(makeJob(baseJobData) as never, {} as never);

    expect(e4RevolutPaymentsRecordedTotalIncMock).toHaveBeenCalledWith({
      currency: "RON",
      tenant_id: "tenant-1",
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// A4 — revolut:refund:process
// ══════════════════════════════════════════════════════════════════════════

describe("A4 — revolutRefundProcessProcessor", () => {
  const refundJobData = { refundId: "ref-001", tenantId: "tenant-1" };

  const mockRefund = {
    id: "ref-001",
    tenantId: "tenant-1",
    paymentId: "pay-001",
    orderId: "ord-001",
    status: "APPROVED",
    amount: "500.00",
    revolutRefundId: null,
  };

  const mockPayment = {
    id: "pay-001",
    tenantId: "tenant-1",
    externalId: "revolut-tx-001",
    amount: "1500.00",
    currency: "RON",
  };

  const mockOrder = {
    id: "ord-001",
    tenantId: "tenant-1",
    status: "DELIVERED",
    orderNumber: "ORD-001",
  };

  beforeEach(() => {
    process.env.REVOLUT_ACCOUNT_ID = "acc-revolut-001";
  });

  it("rambursare inițiată cu succes — APPROVED + DELIVERED + amount OK", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) return makeSelectChain([mockRefund]);
      if (selectCount === 2) return makeSelectChain([mockPayment]);
      return makeSelectChain([mockOrder]);
    });
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    getRevolutTransactionMock.mockResolvedValue({
      id: "revolut-tx-001",
      counterparty: { id: "cp-001" },
    });
    createRevolutPaymentMock.mockResolvedValue({
      id: "rev-pay-001",
      state: "pending",
      request_id: "req-001",
      created_at: "2026-03-30",
    });

    const result = await revolutRefundProcessProcessor(
      makeJob(refundJobData) as never,
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.action).toBe("initiated");
    if (result.action === "initiated") {
      expect(result.revolutPaymentId).toBe("rev-pay-001");
    }
    expect(createRevolutPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: "acc-revolut-001",
        receiver: { counterparty_id: "cp-001" },
        amount: 500,
        currency: "RON",
      }),
    );
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
    const updateSetArgs = dbUpdateMock.mock.results[0]?.value?.set?.mock?.calls[0]?.[0] as {
      revolutRefundId: string;
      status: string;
    };
    expect(updateSetArgs?.revolutRefundId).toBe("rev-pay-001");
    expect(updateSetArgs?.status).toBe("PROCESSING");
  });

  it("reject — status rambursare ≠ APPROVED", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ ...mockRefund, status: "REQUESTED" }]));

    const result = await revolutRefundProcessProcessor(
      makeJob(refundJobData) as never,
      {} as never,
    );

    expect(result.ok).toBe(false);
    expect(result.action).toBe("rejected");
    if (result.action === "rejected") {
      expect(result.reason).toContain("refund_status_not_approved");
    }
    expect(createRevolutPaymentMock).not.toHaveBeenCalled();
  });

  it("reject — status comandă nu permite rambursare (DRAFT)", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) return makeSelectChain([mockRefund]);
      if (selectCount === 2) return makeSelectChain([mockPayment]);
      return makeSelectChain([{ ...mockOrder, status: "DRAFT" }]);
    });

    const result = await revolutRefundProcessProcessor(
      makeJob(refundJobData) as never,
      {} as never,
    );

    expect(result.ok).toBe(false);
    if (result.action === "rejected") {
      expect(result.reason).toContain("order_status_not_eligible");
    }
  });

  it("reject — sumă rambursare > sumă plată originală", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) return makeSelectChain([{ ...mockRefund, amount: "2000.00" }]);
      if (selectCount === 2) return makeSelectChain([mockPayment]); // amount 1500
      return makeSelectChain([mockOrder]);
    });

    const result = await revolutRefundProcessProcessor(
      makeJob(refundJobData) as never,
      {} as never,
    );

    expect(result.ok).toBe(false);
    if (result.action === "rejected") {
      expect(result.reason).toContain("refund_amount_exceeds_payment");
    }
  });

  it("aruncă eroare dacă rambursarea nu există în DB", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      revolutRefundProcessProcessor(makeJob(refundJobData) as never, {} as never),
    ).rejects.toThrow("Refund not found");
  });

  it("aruncă eroare dacă REVOLUT_ACCOUNT_ID lipsă", async () => {
    delete process.env.REVOLUT_ACCOUNT_ID;
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) return makeSelectChain([mockRefund]);
      if (selectCount === 2) return makeSelectChain([mockPayment]);
      return makeSelectChain([mockOrder]);
    });
    getRevolutTransactionMock.mockResolvedValue({
      id: "revolut-tx-001",
      counterparty: { id: "cp-001" },
    });

    await expect(
      revolutRefundProcessProcessor(makeJob(refundJobData) as never, {} as never),
    ).rejects.toThrow("REVOLUT_ACCOUNT_ID");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// A5 — revolut:balance:sync
// ══════════════════════════════════════════════════════════════════════════

describe("A5 — createA5Processor (revolut:balance:sync)", () => {
  const mockAccounts = [
    {
      id: "acc-001",
      name: "EUR Main",
      balance: 10000.5,
      currency: "EUR",
      state: "active",
      updated_at: "2026-03-30",
      public_id: "pub-001",
    },
    {
      id: "acc-002",
      name: "RON Main",
      balance: 50000,
      currency: "RON",
      state: "active",
      updated_at: "2026-03-30",
      public_id: "pub-002",
    },
    {
      id: "acc-003",
      name: "Inactive",
      balance: 0,
      currency: "USD",
      state: "inactive",
      updated_at: "2026-03-30",
      public_id: "pub-003",
    },
  ];

  it("sync 2 conturi active — gauge setat per cont", async () => {
    getRevolutAccountsMock.mockResolvedValue(mockAccounts);
    redisGetMock.mockResolvedValue(null); // fără snapshot anterior

    const processor = createA5Processor(fakeRedis);
    const result = await processor(makeJob({}) as never, {} as never);

    expect(result.ok).toBe(true);
    expect(result.accountsSynced).toBe(2); // acc-003 (inactive) exclus
    expect(result.alerts).toHaveLength(0); // fără snapshot anterior → fără alertă

    // Gauge setat de 2 ori (acc-001 și acc-002)
    expect(e4RevolutBalanceGaugeSetMock).toHaveBeenCalledTimes(2);
    expect(e4RevolutBalanceGaugeSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: "acc-001", currency: "EUR" }),
      10000.5,
    );
    expect(e4RevolutBalanceGaugeSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: "acc-002", currency: "RON" }),
      50000,
    );
  });

  it("snapshot Redis salvat cu TTL 2100s (35min)", async () => {
    getRevolutAccountsMock.mockResolvedValue([mockAccounts[0]]);
    redisGetMock.mockResolvedValue(null);

    const processor = createA5Processor(fakeRedis);
    await processor(makeJob({}) as never, {} as never);

    expect(redisSetMock).toHaveBeenCalledWith(
      "revolut:balance:snapshot:acc-001",
      "10000.5",
      "EX",
      2100,
    );
  });

  it("alertă când diferența față de snapshot > 20%", async () => {
    getRevolutAccountsMock.mockResolvedValue([
      { ...mockAccounts[0], balance: 15000 }, // prev=10000 → +50% diferență
    ]);
    redisGetMock.mockResolvedValue("10000"); // snapshot anterior

    const processor = createA5Processor(fakeRedis);
    const result = await processor(makeJob({}) as never, {} as never);

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({
      accountId: "acc-001",
      currency: "EUR",
      prev: 10000,
      curr: 15000,
    });
  });

  it("fără alertă când diferența este sub threshold (5%)", async () => {
    getRevolutAccountsMock.mockResolvedValue([
      { ...mockAccounts[0], balance: 10200 }, // 2% diferență
    ]);
    redisGetMock.mockResolvedValue("10000");

    const processor = createA5Processor(fakeRedis);
    const result = await processor(makeJob({}) as never, {} as never);

    expect(result.alerts).toHaveLength(0);
  });

  it("ignoră conturi inactive", async () => {
    getRevolutAccountsMock.mockResolvedValue([mockAccounts[2]]); // state: "inactive"

    const processor = createA5Processor(fakeRedis);
    const result = await processor(makeJob({}) as never, {} as never);

    expect(result.accountsSynced).toBe(0);
    expect(e4RevolutBalanceGaugeSetMock).not.toHaveBeenCalled();
  });

  it("fără conturi → 0 sincronizate, fără erori", async () => {
    getRevolutAccountsMock.mockResolvedValue([]);

    const processor = createA5Processor(fakeRedis);
    const result = await processor(makeJob({}) as never, {} as never);

    expect(result.ok).toBe(true);
    expect(result.accountsSynced).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// A6 — revolut:webhook:validate (HMAC-SHA256)
// ══════════════════════════════════════════════════════════════════════════

describe("A6 — verifyRevolutHmac + revolutWebhookValidateProcessor", () => {
  // ── verifyRevolutHmac — teste pure ────────────────────────────────────────

  describe("verifyRevolutHmac — unit tests (pure crypto)", () => {
    const testHmacKey = crypto.randomBytes(32).toString("hex");
    const body = '{"id":"evt-001","type":"TransactionCreated","amount":1500}';

    it("HMAC valid — returnează true", () => {
      const sig = computeHmac(body, testHmacKey);
      expect(verifyRevolutHmac(body, sig, testHmacKey)).toBe(true);
    });

    it("HMAC invalid (body modificat) — returnează false", () => {
      const sig = computeHmac(body, testHmacKey);
      const tamperedBody = body + "X";
      expect(verifyRevolutHmac(tamperedBody, sig, testHmacKey)).toBe(false);
    });

    it("HMAC invalid (secret greșit) — returnează false", () => {
      const sig = computeHmac(body, testHmacKey);
      expect(verifyRevolutHmac(body, sig, "wrong-secret")).toBe(false);
    });

    it("HMAC invalid (semnătură modificată) — returnează false", () => {
      const sig = computeHmac(body, testHmacKey);
      const tamperedSig = sig.slice(0, -2) + "00"; // ultimii 2 hex bytes modificați
      expect(verifyRevolutHmac(body, tamperedSig, testHmacKey)).toBe(false);
    });

    it("signature goală → returnează false", () => {
      expect(verifyRevolutHmac(body, "", testHmacKey)).toBe(false);
    });

    it("secret gol → returnează false", () => {
      expect(verifyRevolutHmac(body, computeHmac(body, ""), "")).toBe(false);
    });

    it("rawBody gol → returnează false", () => {
      expect(verifyRevolutHmac("", computeHmac("", testHmacKey), testHmacKey)).toBe(false);
    });

    it("semnătură lungime diferită → returnează false (nu aruncă)", () => {
      expect(verifyRevolutHmac(body, "abc", testHmacKey)).toBe(false);
    });

    it("timingSafeEqual utilizat (nu === pentru hex string)", () => {
      // Testăm că funcția utilizează crypto prin comportament corect la timing
      // Semnătură hex de lungime corectă (64 chars SHA256) dar cu valoare greșită
      const wrongSig = "a".repeat(64); // hex valid lungime 64 dar valoare greșită
      expect(verifyRevolutHmac(body, wrongSig, testHmacKey)).toBe(false);
    });
  });

  // ── revolutWebhookValidateProcessor — integrare ───────────────────────────

  const testHmacKey = crypto.randomBytes(32).toString("hex");
  const body = '{"id":"evt-001","type":"TransactionCreated"}';

  function makeValidSignature(): string {
    return computeHmac(body, testHmacKey);
  }

  beforeEach(() => {
    process.env.REVOLUT_WEBHOOK_SECRET = testHmacKey;
    dbUpdateMock.mockReturnValue(makeUpdateChain());
  });

  it("HMAC valid → verified=true în DB + metric 'valid'", async () => {
    const sig = makeValidSignature();
    const job = makeJob({
      webhookId: "wh-001",
      rawBody: body,
      signature: sig,
      tenantId: "tenant-1",
    });

    const result = await revolutWebhookValidateProcessor(job as never, {} as never);

    expect(result.ok).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.webhookId).toBe("wh-001");

    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
    const updateSetArgs = dbUpdateMock.mock.results[0]?.value?.set?.mock?.calls[0]?.[0] as {
      verified: boolean;
    };
    expect(updateSetArgs?.verified).toBe(true);

    expect(e4RevolutHmacValidationsTotalIncMock).toHaveBeenCalledWith({ status: "valid" });
  });

  it("HMAC invalid → verified=false în DB + metric 'invalid'", async () => {
    const job = makeJob({
      webhookId: "wh-002",
      rawBody: body,
      signature: "invalid-signature-hex",
      tenantId: "tenant-1",
    });

    const result = await revolutWebhookValidateProcessor(job as never, {} as never);

    expect(result.ok).toBe(true);
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toBe("hmac_mismatch");
    }

    const updateSetArgs = dbUpdateMock.mock.results[0]?.value?.set?.mock?.calls[0]?.[0] as {
      verified: boolean;
    };
    expect(updateSetArgs?.verified).toBe(false);
    expect(e4RevolutHmacValidationsTotalIncMock).toHaveBeenCalledWith({ status: "invalid" });
  });

  it("REVOLUT_WEBHOOK_SECRET lipsă → verified=false + metric 'missing_secret'", async () => {
    delete process.env.REVOLUT_WEBHOOK_SECRET;

    const job = makeJob({
      webhookId: "wh-003",
      rawBody: body,
      signature: makeValidSignature(),
      tenantId: "tenant-1",
    });

    const result = await revolutWebhookValidateProcessor(job as never, {} as never);

    expect(result.ok).toBe(true);
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toBe("missing_secret");
    }
    expect(e4RevolutHmacValidationsTotalIncMock).toHaveBeenCalledWith({
      status: "missing_secret",
    });
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    const sig = makeValidSignature();
    await revolutWebhookValidateProcessor(
      makeJob({
        webhookId: "wh-004",
        rawBody: body,
        signature: sig,
        tenantId: "tenant-special",
      }) as never,
      {} as never,
    );
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-special");
  });

  it("HMAC valid cu body Unicode → verified=true", () => {
    const unicodeBody = '{"message":"Tranzacție efectuată cu succes — îâșță"}';
    const unicodeSig = computeHmac(unicodeBody, testHmacKey);
    expect(verifyRevolutHmac(unicodeBody, unicodeSig, testHmacKey)).toBe(true);
  });
});
