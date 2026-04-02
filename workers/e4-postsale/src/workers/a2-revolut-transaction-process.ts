/**
 * A2 — revolut:transaction:process
 *
 * Responsabilitate (plan §IX A2):
 * - Parsează eventType: 'TransactionCreated', 'TransactionStateChanged', 'TransferStateChanged'
 * - Mapează la entități interne: plată primită, transfer inițiat, refund procesat
 * - Extrage: amount, currency, counterpartyName, counterpartyIban, reference
 * - Enqueue A3 (revolut:payment:record) cu date parsate
 * - Eveniment necunoscut sau payload invalid → skip cu log (nu aruncă)
 */
import type { Processor } from "bullmq";
import { createQueue, QUEUES } from "@cerniq/worker-shared";

export type TransactionProcessJobData = {
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  tenantId: string;
};

export type ParsedTransactionData = {
  externalId: string;
  amount: number;
  currency: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  reference?: string;
  receivedAt?: string;
  /** Tip intern dedus din eventType + state */
  internalType: "payment_received" | "transfer_initiated" | "refund_processed" | "unknown";
};

export type TransactionProcessResult =
  | { ok: true; action: "enqueued_a3"; parsedData: ParsedTransactionData; webhookId: string }
  | { ok: true; action: "skipped"; reason: string; webhookId: string };

const SUPPORTED_EVENT_TYPES = new Set([
  "TransactionCreated",
  "TransactionStateChanged",
  "TransferStateChanged",
]);

/**
 * Extrage un câmp string dintr-un obiect Record.
 * Returnează undefined dacă obiectul lipsește sau valoarea nu este string.
 */
function extractStringField(
  obj: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!obj) return undefined;
  const val = obj[key];
  return typeof val === "string" ? val : undefined;
}

/**
 * Determină tipul intern al tranzacției bazat pe eventType, tip și stare Revolut.
 * Extrasă din parseRevolutPayload pentru a reduce complexitatea cognitivă.
 */
function resolveInternalType(
  eventType: string,
  txType: string,
  state: string,
  amount: number,
): ParsedTransactionData["internalType"] {
  if (eventType === "TransactionCreated") {
    if (txType === "card_refund" || state === "reverted") return "refund_processed";
    if (amount >= 0) return "payment_received";
    return "unknown";
  }
  if (eventType === "TransactionStateChanged") {
    if (state === "completed" || state === "reverted") {
      return amount < 0 ? "transfer_initiated" : "payment_received";
    }
    return "unknown";
  }
  if (eventType === "TransferStateChanged") return "transfer_initiated";
  return "unknown";
}

/**
 * Parsează payload-ul Revolut și extrage datele tranzacției.
 * Returnează null dacă payload-ul nu conține datele necesare.
 */
function parseRevolutPayload(
  eventType: string,
  payload: Record<string, unknown>,
): ParsedTransactionData | null {
  const data = (payload.data ?? payload) as Record<string, unknown>;

  const id = data.id;
  if (typeof id !== "string" || !id) return null;

  const amount = typeof data.amount === "number" ? data.amount : Number(data.amount ?? 0);
  const currency = extractStringField(data, "currency") ?? "RON";

  const counterparty = data.counterparty as Record<string, unknown> | undefined;
  const counterpartyName = extractStringField(counterparty, "name");
  const counterpartyIban = extractStringField(counterparty, "iban");

  const reference = extractStringField(data, "reference");
  const completedAt = extractStringField(data, "completed_at");
  const createdAt = extractStringField(data, "created_at");

  const type = extractStringField(data, "type") ?? "";
  const state = extractStringField(data, "state") ?? "";

  const internalType = resolveInternalType(eventType, type, state, amount);

  return {
    externalId: id,
    amount: Math.abs(amount),
    currency,
    counterpartyName,
    counterpartyIban,
    reference,
    receivedAt: completedAt ?? createdAt,
    internalType,
  };
}

export const revolutTransactionProcessProcessor: Processor<TransactionProcessJobData> = async (
  job,
): Promise<TransactionProcessResult> => {
  const { webhookId, eventType, payload, tenantId } = job.data;

  if (!SUPPORTED_EVENT_TYPES.has(eventType)) {
    job.log(`[A2] Unsupported eventType=${eventType}, skipping`);
    return {
      ok: true,
      action: "skipped",
      reason: `unsupported_event_type:${eventType}`,
      webhookId,
    };
  }

  const parsedData = parseRevolutPayload(eventType, payload);

  if (!parsedData) {
    job.log(`[A2] Cannot parse payload for eventType=${eventType}, skipping`);
    return { ok: true, action: "skipped", reason: "unparseable_payload", webhookId };
  }

  if (parsedData.internalType === "unknown") {
    job.log(
      `[A2] Unknown internal type for eventType=${eventType} state=${String((payload.data as Record<string, unknown> | undefined)?.state ?? payload.state)}`,
    );
    return { ok: true, action: "skipped", reason: "unknown_internal_type", webhookId };
  }

  // ── Enqueue A3 (revolut:payment:record) ─────────────────────────────────
  const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? "4");
  const a3Queue = createQueue(QUEUES.E4_REVOLUT_PAYMENT_RECORD, { db: REDIS_DB_E4 });

  await a3Queue.add(
    "record",
    {
      webhookId,
      tenantId,
      externalId: parsedData.externalId,
      amount: parsedData.amount,
      currency: parsedData.currency,
      counterpartyName: parsedData.counterpartyName,
      counterpartyIban: parsedData.counterpartyIban,
      reference: parsedData.reference,
      receivedAt: parsedData.receivedAt,
      internalType: parsedData.internalType,
    },
    { jobId: `a3:${webhookId}` },
  );

  await a3Queue.close();

  job.log(
    `[A2] Enqueued A3 for webhookId=${webhookId} externalId=${parsedData.externalId} type=${parsedData.internalType}`,
  );

  return { ok: true, action: "enqueued_a3", parsedData, webhookId };
};

// Export parseRevolutPayload pentru testare unitară
export { parseRevolutPayload };
