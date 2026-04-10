/**
 * Bootstrap worker E4 Post-Sale — Revolut Payments & Logistics.
 *
 * Înregistrare workeri A1-A6 (FAZA 8b):
 * A1: revolut:webhook:ingest — idempotency Redis + persistare + enqueue A2+A6
 * A2: revolut:transaction:process — parsare payload Revolut
 * A3: revolut:payment:record — INSERT gold_payments + trigger B7
 * A4: revolut:refund:process — verificare eligibilitate + Revolut API POST /pay
 * A5: revolut:balance:sync — cron la fiecare 30 minute + gauge Prometheus
 * A6: revolut:webhook:validate — HMAC-SHA256 cu timingSafeEqual
 *
 * Redis DB: REDIS_DB_E4=4 (plan §XIV L2762)
 * BullMQ prefix: BULLMQ_PREFIX=cerniq: (plan §XIV L2757)
 */
import Redis from "ioredis";
import type { Worker } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import {
  assertQueueRegistryComplete,
  createHealthServer,
  createQueue,
  createWorker,
  getRedisConnectionOptions,
  loadSecretsFromFile,
  QUEUES,
  startQueueDepthMonitor,
} from "@cerniq/worker-shared";
import { createA1Processor } from "./workers/a1-revolut-webhook-ingest.js";
import { revolutTransactionProcessProcessor } from "./workers/a2-revolut-transaction-process.js";
import { revolutPaymentRecordProcessor } from "./workers/a3-revolut-payment-record.js";
import { revolutRefundProcessProcessor } from "./workers/a4-revolut-refund-process.js";
import { createA5Processor } from "./workers/a5-revolut-balance-sync.js";
import { revolutWebhookValidateProcessor } from "./workers/a6-revolut-webhook-validate.js";
import { paymentReconcileAutoProcessor } from "./workers/b7-payment-reconcile-auto.js";
import { paymentReconcileFuzzyProcessor } from "./workers/b8-payment-reconcile-fuzzy.js";
import { paymentReconcileManualProcessor } from "./workers/b9-payment-reconcile-manual.js";
import { paymentBalanceUpdateProcessor } from "./workers/b10-payment-balance-update.js";
import { createB11Processor } from "./workers/b11-payment-overdue-detect.js";
import { paymentOverdueEscalateProcessor } from "./workers/b12-payment-overdue-escalate.js";
// FAZA 8d — C13-D21 Credit Scoring 100p
import { creditProfileCreateProcessor } from "./workers/c13-credit-profile-create.js";
import { creditDataFetchAnafProcessor } from "./workers/c14-credit-data-fetch-anaf.js";
import { creditDataFetchBilantProcessor } from "./workers/c15-credit-data-fetch-bilant.js";
import { creditDataFetchBpiProcessor } from "./workers/c16-credit-data-fetch-bpi.js";
import { creditScoreCalculateProcessor } from "./workers/c17-credit-score-calculate.js";
import { creditLimitCalculateProcessor } from "./workers/c18-credit-limit-calculate.js";
import { creditLimitCheckProcessor } from "./workers/d19-credit-limit-check.js";
import { creditLimitReserveProcessor } from "./workers/d20-credit-limit-reserve.js";
import { creditLimitReleaseProcessor } from "./workers/d21-credit-limit-release.js";
import { creditRefreshAllProcessor } from "./workers/credit-refresh-all.js";
import { reservationExpireProcessor } from "./workers/reservation-expire.js";
// FAZA 8e — E22-E27 Sameday AWB + Tracking
import { samedayAwbCreateProcessor } from "./workers/e22-sameday-awb-create.js";
import { samedayStatusPollProcessor } from "./workers/e23-sameday-status-poll.js";
import { samedayStatusProcessProcessor } from "./workers/e24-sameday-status-process.js";
import { samedayCodProcessProcessor } from "./workers/e25-sameday-cod-process.js";
import { samedayReturnInitiateProcessor } from "./workers/e26-sameday-return-initiate.js";
import { samedayPickupScheduleProcessor } from "./workers/e27-sameday-pickup-schedule.js";
// FAZA 8f — G32-G36 Contracte DocuSign
import { contractGenerateProcessor } from "./workers/g32-contract-generate.js";
import { contractClausesSelectProcessor } from "./workers/g33-contract-clauses-select.js";
import { contractDocuSignSendProcessor } from "./workers/g34-contract-docusign-send.js";
import { contractStatusPollProcessor } from "./workers/g35-contract-status-poll.js";
import { contractSignedProcessProcessor } from "./workers/g36-contract-signed-process.js";
// FAZA 8g — F28-F31 Stock Sync Oblio
import { stockSyncOblioProcessor } from "./workers/f28-stock-sync-oblio.js";
import { stockDeductProcessor } from "./workers/f29-stock-deduct.js";
import { stockReturnProcessor } from "./workers/f30-stock-return.js";
import { stockLowAlertProcessor } from "./workers/f31-stock-alert.js";
// FAZA 8g — H37-H38 Returns
import { returnInitiateProcessor } from "./workers/h37-return-initiate.js";
import { returnProcessProcessor } from "./workers/h38-return-process.js";
// FAZA 8g — I39-I44 AlertNeuron
import {
  alertPaymentProcessor,
  alertDeliveryProcessor,
  alertCreditProcessor,
  alertContractProcessor,
  alertStockProcessor,
  alertDispatchProcessor,
} from "./workers/i-alert-workers.js";
// FAZA 8g — J45-J47 Audit Hash-Chain
import { auditLogWriteProcessor } from "./workers/j45-audit-log-write.js";
import { auditChainVerifyProcessor } from "./workers/j46-audit-chain-verify.js";
import { auditDataAnonymizeProcessor } from "./workers/j47-audit-anonymize.js";
// FAZA 8g — K48-K53 HumanNeuron HITL
import {
  hitlCreditOverrideProcessor,
  hitlCreditLimitProcessor,
  hitlRefundLargeProcessor,
  hitlPaymentInvestigationProcessor,
  hitlTaskResolveProcessor,
  hitlEscalationOverdueProcessor,
} from "./workers/k-hitl-workers.js";

const svcLog = createServiceLogger("worker-e4-postsale");

const PORT = Number(process.env.PORT ?? "3000");
const SECRETS_PATH = process.env.SECRETS_PATH?.trim() ?? "/secrets/workers.env";

// Redis DB 4 pentru toate cozile E4 (plan §XIV L2762)
// Anti-halucinare: NU hardcodat — citit din env REDIS_DB_E4
const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? process.env.REDIS_DB ?? "4");

function getE4Redis(): Redis {
  return new Redis({
    ...getRedisConnectionOptions({ db: REDIS_DB_E4 }),
    enableOfflineQueue: false,
    lazyConnect: true,
  });
}

async function bootstrap(): Promise<void> {
  // ── 1. Încarcă secretele din OpenBao (REVOLUT_API_TOKEN, REVOLUT_WEBHOOK_SECRET) ──
  loadSecretsFromFile(false, SECRETS_PATH, {
    searchPaths: [SECRETS_PATH, "/secrets/e4-postsale.env", "/secrets/workers.env"],
    exitOnMissing: false,
  });

  assertQueueRegistryComplete();

  // ── 2. Conectare Redis DB 4 ───────────────────────────────────────────────
  const redis = getE4Redis();
  await redis.connect();

  const workers: Worker[] = [];
  const push = (w: Worker) => workers.push(w);

  // ── 3. Înregistrare workeri A1-A6 ────────────────────────────────────────

  // A1 — revolut:webhook:ingest (nevoie Redis pentru idempotency)
  const { worker: a1Worker } = createWorker(
    QUEUES.E4_REVOLUT_WEBHOOK_INGEST,
    createA1Processor(redis),
    { db: REDIS_DB_E4, concurrency: 50 },
  );
  push(a1Worker);

  // A2 — revolut:transaction:process
  const { worker: a2Worker } = createWorker(
    QUEUES.E4_REVOLUT_TRANSACTION_PROCESS,
    revolutTransactionProcessProcessor,
    { db: REDIS_DB_E4, concurrency: 20 },
  );
  push(a2Worker);

  // A3 — revolut:payment:record
  const { worker: a3Worker } = createWorker(
    QUEUES.E4_REVOLUT_PAYMENT_RECORD,
    revolutPaymentRecordProcessor,
    { db: REDIS_DB_E4, concurrency: 10 },
  );
  push(a3Worker);

  // A4 — revolut:refund:process
  const { worker: a4Worker } = createWorker(
    QUEUES.E4_REVOLUT_REFUND_PROCESS,
    revolutRefundProcessProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(a4Worker);

  // A5 — revolut:balance:sync (nevoie Redis pentru snapshot cache)
  const { worker: a5Worker } = createWorker(
    QUEUES.E4_REVOLUT_BALANCE_SYNC,
    createA5Processor(redis),
    { db: REDIS_DB_E4, concurrency: 1 },
  );
  push(a5Worker);

  // A6 — revolut:webhook:validate (HMAC-SHA256)
  const { worker: a6Worker } = createWorker(
    QUEUES.E4_REVOLUT_WEBHOOK_VALIDATE,
    revolutWebhookValidateProcessor,
    { db: REDIS_DB_E4, concurrency: 50 },
  );
  push(a6Worker);

  // ── Workeri B7-B12 — Reconciliere Plăți Three-Tier (FAZA 8c) ─────────────

  // B7 — payment:reconcile:auto (Tier 1 exact match)
  const { worker: b7Worker } = createWorker(
    QUEUES.E4_PAYMENT_RECONCILE_AUTO,
    paymentReconcileAutoProcessor,
    { db: REDIS_DB_E4, concurrency: 20 },
  );
  push(b7Worker);

  // B8 — payment:reconcile:fuzzy (Tier 2 pg_trgm)
  const { worker: b8Worker } = createWorker(
    QUEUES.E4_PAYMENT_RECONCILE_FUZZY,
    paymentReconcileFuzzyProcessor,
    { db: REDIS_DB_E4, concurrency: 10 },
  );
  push(b8Worker);

  // B9 — payment:reconcile:manual (Tier 3 HITL)
  const { worker: b9Worker } = createWorker(
    QUEUES.E4_PAYMENT_RECONCILE_MANUAL,
    paymentReconcileManualProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(b9Worker);

  // B10 — payment:balance:update (post-match balance actualizare)
  const { worker: b10Worker } = createWorker(
    QUEUES.E4_PAYMENT_BALANCE_UPDATE,
    paymentBalanceUpdateProcessor,
    { db: REDIS_DB_E4, concurrency: 20 },
  );
  push(b10Worker);

  // B11 — payment:overdue:detect (cron 0 9 * * * — zilnic 09:00)
  const { worker: b11Worker } = createWorker(
    QUEUES.E4_PAYMENT_OVERDUE_DETECT,
    createB11Processor(),
    { db: REDIS_DB_E4, concurrency: 1 },
  );
  push(b11Worker);

  // B12 — payment:overdue:escalate (alerte graduated 1-7d/7-14d/14+)
  const { worker: b12Worker } = createWorker(
    QUEUES.E4_PAYMENT_OVERDUE_ESCALATE,
    paymentOverdueEscalateProcessor,
    { db: REDIS_DB_E4, concurrency: 10 },
  );
  push(b12Worker);

  // ── 4. Workeri C13-D21: Credit Scoring 100p (FAZA 8d) ──────────────────

  // C13 — credit:profile:create (trigger la client:created)
  const { worker: c13Worker } = createWorker(
    QUEUES.E4_CREDIT_PROFILE_CREATE,
    creditProfileCreateProcessor,
    { db: REDIS_DB_E4, concurrency: 3 },
  );
  push(c13Worker);

  // C14 — credit:data:fetch-anaf (child FlowProducer — parallel cu C15+C16)
  const { worker: c14Worker } = createWorker(
    QUEUES.E4_CREDIT_DATA_FETCH_ANAF,
    creditDataFetchAnafProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(c14Worker);

  // C15 — credit:data:fetch-bilant (child FlowProducer)
  const { worker: c15Worker } = createWorker(
    QUEUES.E4_CREDIT_DATA_FETCH_BILANT,
    creditDataFetchBilantProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(c15Worker);

  // C16 — credit:data:fetch-bpi (child FlowProducer)
  const { worker: c16Worker } = createWorker(
    QUEUES.E4_CREDIT_DATA_FETCH_BPI,
    creditDataFetchBpiProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(c16Worker);

  // C17 — credit:score:calculate (parent FlowProducer — după C14+C15+C16 complete)
  const { worker: c17Worker } = createWorker(
    QUEUES.E4_CREDIT_SCORE_CALCULATE,
    creditScoreCalculateProcessor,
    { db: REDIS_DB_E4, concurrency: 3 },
  );
  push(c17Worker);

  // C18 — credit:limit:calculate (HITL dacă >50K RON, SLA 4h CFO)
  const { worker: c18Worker } = createWorker(
    QUEUES.E4_CREDIT_LIMIT_CALCULATE,
    creditLimitCalculateProcessor,
    { db: REDIS_DB_E4, concurrency: 3 },
  );
  push(c18Worker);

  // D19 — credit:limit:check (la order:created, CRITICAL path)
  const { worker: d19Worker } = createWorker(
    QUEUES.E4_CREDIT_LIMIT_CHECK,
    creditLimitCheckProcessor,
    { db: REDIS_DB_E4, concurrency: 20 },
  );
  push(d19Worker);

  // D20 — credit:limit:reserve (D19 approved)
  const { worker: d20Worker } = createWorker(
    QUEUES.E4_CREDIT_LIMIT_RESERVE,
    creditLimitReserveProcessor,
    { db: REDIS_DB_E4, concurrency: 10 },
  );
  push(d20Worker);

  // D21 — credit:limit:release (order:paid sau order:cancelled)
  const { worker: d21Worker } = createWorker(
    QUEUES.E4_CREDIT_LIMIT_RELEASE,
    creditLimitReleaseProcessor,
    { db: REDIS_DB_E4, concurrency: 10 },
  );
  push(d21Worker);

  // CRON credit:refresh-all — bulk refresh profile credit via Termene.ro
  const { worker: creditRefreshWorker } = createWorker(
    QUEUES.E4_CREDIT_REFRESH_ALL,
    creditRefreshAllProcessor,
    { db: REDIS_DB_E4, concurrency: 1 },
  );
  push(creditRefreshWorker);

  // CRON reservation:expire — expiră rezervări stale (persistent DB)
  const { worker: reservationExpireWorker } = createWorker(
    QUEUES.E4_RESERVATION_EXPIRE,
    reservationExpireProcessor,
    { db: REDIS_DB_E4, concurrency: 1 },
  );
  push(reservationExpireWorker);

  // ── FAZA 8e — E22-E27 Sameday AWB + Tracking ────────────────────────────

  // E22 — sameday:awb:create (trigger la order:ready)
  const { worker: e22Worker } = createWorker(
    QUEUES.E4_SAMEDAY_AWB_CREATE,
    samedayAwbCreateProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(e22Worker);

  // E23 — sameday:status:poll (CRON */30 — singleton)
  const { worker: e23Worker } = createWorker(
    QUEUES.E4_SAMEDAY_STATUS_POLL,
    samedayStatusPollProcessor,
    { db: REDIS_DB_E4, concurrency: 1 },
  );
  push(e23Worker);

  // E24 — sameday:status:process (enqueue din E23)
  const { worker: e24Worker } = createWorker(
    QUEUES.E4_SAMEDAY_STATUS_PROCESS,
    samedayStatusProcessProcessor,
    { db: REDIS_DB_E4, concurrency: 10 },
  );
  push(e24Worker);

  // E25 — sameday:cod:process (enqueue din E24 la DELIVERED)
  const { worker: e25Worker } = createWorker(
    QUEUES.E4_SAMEDAY_COD_PROCESS,
    samedayCodProcessProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(e25Worker);

  // E26 — sameday:return:initiate (enqueue din E24 la DELIVERY_FAILED)
  const { worker: e26Worker } = createWorker(
    QUEUES.E4_SAMEDAY_RETURN_INITIATE,
    samedayReturnInitiateProcessor,
    { db: REDIS_DB_E4, concurrency: 3 },
  );
  push(e26Worker);

  // E27 — sameday:pickup:schedule (CRON 0 14 * * * — singleton)
  const { worker: e27Worker } = createWorker(
    QUEUES.E4_SAMEDAY_PICKUP_SCHEDULE,
    samedayPickupScheduleProcessor,
    { db: REDIS_DB_E4, concurrency: 1 },
  );
  push(e27Worker);

  // ── FAZA 8f — G32-G36 Contracte DocuSign ─────────────────────────────────

  // G32 — contract:generate (trigger la credit_approved)
  const { worker: g32Worker } = createWorker(
    QUEUES.E4_CONTRACT_GENERATE,
    contractGenerateProcessor,
    { db: REDIS_DB_E4, concurrency: 3 },
  );
  push(g32Worker);

  // G33 — contract:clauses:select (enqueue din G32)
  const { worker: g33Worker } = createWorker(
    QUEUES.E4_CONTRACT_CLAUSES_SELECT,
    contractClausesSelectProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(g33Worker);

  // G34 — contract:docusign:send (enqueue din G33; rate 15 req/min DocuSign)
  const { worker: g34Worker } = createWorker(
    QUEUES.E4_CONTRACT_DOCUSIGN_SEND,
    contractDocuSignSendProcessor,
    { db: REDIS_DB_E4, concurrency: 3 },
  );
  push(g34Worker);

  // G35 — contract:status:poll (CRON 0 1 * * * — singleton)
  const { worker: g35Worker } = createWorker(
    QUEUES.E4_CONTRACT_STATUS_POLL,
    contractStatusPollProcessor,
    { db: REDIS_DB_E4, concurrency: 1 },
  );
  push(g35Worker);

  // G36 — contract:signed:process (enqueue din G35)
  const { worker: g36Worker } = createWorker(
    QUEUES.E4_CONTRACT_SIGNED_PROCESS,
    contractSignedProcessProcessor,
    { db: REDIS_DB_E4, concurrency: 3 },
  );
  push(g36Worker);

  // ── 4g. FAZA 8g — F28-F31 Stock Sync Oblio ───────────────────────────────

  // F28 — stock:sync:oblio (cron */15 — singleton)
  const { worker: f28Worker } = createWorker(QUEUES.E4_STOCK_SYNC_OBLIO, stockSyncOblioProcessor, {
    db: REDIS_DB_E4,
    concurrency: 2,
  });
  push(f28Worker);

  // F29 — stock:deduct
  const { worker: f29Worker } = createWorker(QUEUES.E4_STOCK_DEDUCT, stockDeductProcessor, {
    db: REDIS_DB_E4,
    concurrency: 10,
  });
  push(f29Worker);

  // F30 — stock:return
  const { worker: f30Worker } = createWorker(QUEUES.E4_STOCK_RETURN, stockReturnProcessor, {
    db: REDIS_DB_E4,
    concurrency: 5,
  });
  push(f30Worker);

  // F31 — stock:low:alert
  const { worker: f31Worker } = createWorker(QUEUES.E4_STOCK_LOW_ALERT, stockLowAlertProcessor, {
    db: REDIS_DB_E4,
    concurrency: 5,
  });
  push(f31Worker);

  // ── 4h. FAZA 8g — H37-H38 Returns ────────────────────────────────────────

  // H37 — return:initiate
  const { worker: h37Worker } = createWorker(QUEUES.E4_RETURN_INITIATE, returnInitiateProcessor, {
    db: REDIS_DB_E4,
    concurrency: 5,
  });
  push(h37Worker);

  // H38 — return:process
  const { worker: h38Worker } = createWorker(QUEUES.E4_RETURN_PROCESS, returnProcessProcessor, {
    db: REDIS_DB_E4,
    concurrency: 5,
  });
  push(h38Worker);

  // ── 4i. FAZA 8g — I39-I44 AlertNeuron ────────────────────────────────────

  const { worker: i39Worker } = createWorker(QUEUES.E4_ALERT_PAYMENT, alertPaymentProcessor, {
    db: REDIS_DB_E4,
    concurrency: 10,
  });
  push(i39Worker);

  const { worker: i40Worker } = createWorker(QUEUES.E4_ALERT_DELIVERY, alertDeliveryProcessor, {
    db: REDIS_DB_E4,
    concurrency: 10,
  });
  push(i40Worker);

  const { worker: i41Worker } = createWorker(QUEUES.E4_ALERT_CREDIT, alertCreditProcessor, {
    db: REDIS_DB_E4,
    concurrency: 10,
  });
  push(i41Worker);

  const { worker: i42Worker } = createWorker(QUEUES.E4_ALERT_CONTRACT, alertContractProcessor, {
    db: REDIS_DB_E4,
    concurrency: 10,
  });
  push(i42Worker);

  const { worker: i43Worker } = createWorker(QUEUES.E4_ALERT_STOCK, alertStockProcessor, {
    db: REDIS_DB_E4,
    concurrency: 10,
  });
  push(i43Worker);

  const { worker: i44Worker } = createWorker(QUEUES.E4_ALERT_DISPATCH, alertDispatchProcessor, {
    db: REDIS_DB_E4,
    concurrency: 10,
  });
  push(i44Worker);

  // ── 4j. FAZA 8g — J45-J47 Audit Hash-Chain ───────────────────────────────

  // J45 — audit:log:write (CRITICAL: concurrency=1 pentru serializare hash chain)
  const { worker: j45Worker } = createWorker(QUEUES.E4_AUDIT_LOG_WRITE, auditLogWriteProcessor, {
    db: REDIS_DB_E4,
    concurrency: 1,
  });
  push(j45Worker);

  // J46 — audit:chain:verify (cron 0 6 * * * — singleton)
  const { worker: j46Worker } = createWorker(
    QUEUES.E4_AUDIT_CHAIN_VERIFY,
    auditChainVerifyProcessor,
    { db: REDIS_DB_E4, concurrency: 1 },
  );
  push(j46Worker);

  // J47 — audit:data:anonymize (cron 0 2 * * 0 — singleton, duminică)
  const { worker: j47Worker } = createWorker(
    QUEUES.E4_AUDIT_DATA_ANONYMIZE,
    auditDataAnonymizeProcessor,
    { db: REDIS_DB_E4, concurrency: 1 },
  );
  push(j47Worker);

  // ── 4k. FAZA 8g — K48-K53 HumanNeuron HITL ───────────────────────────────

  const { worker: k48Worker } = createWorker(
    QUEUES.E4_HITL_CREDIT_OVERRIDE,
    hitlCreditOverrideProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(k48Worker);

  const { worker: k49Worker } = createWorker(
    QUEUES.E4_HITL_CREDIT_LIMIT,
    hitlCreditLimitProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(k49Worker);

  const { worker: k50Worker } = createWorker(
    QUEUES.E4_HITL_REFUND_LARGE,
    hitlRefundLargeProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(k50Worker);

  const { worker: k51Worker } = createWorker(
    QUEUES.E4_HITL_PAYMENT_INVESTIGATION,
    hitlPaymentInvestigationProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(k51Worker);

  const { worker: k52Worker } = createWorker(
    QUEUES.E4_HITL_TASK_RESOLVE,
    hitlTaskResolveProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(k52Worker);

  const { worker: k53Worker } = createWorker(
    QUEUES.E4_HITL_ESCALATION_OVERDUE,
    hitlEscalationOverdueProcessor,
    { db: REDIS_DB_E4, concurrency: 5 },
  );
  push(k53Worker);

  // ── 5. Cron A5: revolut:balance:sync — */30 * * * * ─────────────────────
  const balanceSyncQueue = createQueue(QUEUES.E4_REVOLUT_BALANCE_SYNC, { db: REDIS_DB_E4 });
  await balanceSyncQueue.add(
    "sync",
    {},
    {
      repeat: { pattern: "0,30 * * * *" },
      jobId: "revolut:balance:sync:cron",
    },
  );

  // ── 5b. Cron B11: payment:overdue:detect — 0 9 * * * (zilnic 09:00) ──────
  const overdueDetectQueue = createQueue(QUEUES.E4_PAYMENT_OVERDUE_DETECT, { db: REDIS_DB_E4 });
  await overdueDetectQueue.add(
    "detect",
    {},
    {
      repeat: { pattern: "0 9 * * *" },
      jobId: "payment:overdue:detect:cron",
    },
  );

  // ── 5c. Cron C13-refresh: pipeline:credit:refresh-all — 0 3 * * * ────────
  const creditRefreshQueue = createQueue(QUEUES.E4_CREDIT_REFRESH_ALL, { db: REDIS_DB_E4 });
  await creditRefreshQueue.add(
    "refresh",
    {},
    {
      repeat: { pattern: "0 3 * * *" },
      jobId: "credit:refresh-all:cron",
    },
  );

  // ── 5d. Cron reservation:expire — */15 * * * * ────────────────────────────
  const reservationExpireQueue = createQueue(QUEUES.E4_RESERVATION_EXPIRE, { db: REDIS_DB_E4 });
  await reservationExpireQueue.add(
    "expire",
    {},
    {
      repeat: { pattern: "*/15 * * * *" },
      jobId: "reservation:expire:cron",
    },
  );

  // ── 5e. Cron E23: sameday:status:poll — */30 * * * * ─────────────────────
  const samedayPollQueue = createQueue(QUEUES.E4_SAMEDAY_STATUS_POLL, { db: REDIS_DB_E4 });
  await samedayPollQueue.add(
    "poll",
    {},
    {
      repeat: { pattern: "*/30 * * * *" },
      jobId: "sameday:status:poll:cron",
    },
  );

  // ── 5f. Cron E27: sameday:pickup:schedule — 0 14 * * * ───────────────────
  const samedayPickupQueue = createQueue(QUEUES.E4_SAMEDAY_PICKUP_SCHEDULE, { db: REDIS_DB_E4 });
  await samedayPickupQueue.add(
    "schedule",
    {},
    {
      repeat: { pattern: "0 14 * * *" },
      jobId: "sameday:pickup:schedule:cron",
    },
  );

  // ── 5g. Cron G35: contract:status:poll — 0 1 * * * (Plan L2129) ──────────
  const contractPollQueue = createQueue(QUEUES.E4_CONTRACT_STATUS_POLL, { db: REDIS_DB_E4 });
  await contractPollQueue.add(
    "poll",
    {},
    {
      repeat: { pattern: "0 1 * * *" },
      jobId: "contract:status:poll:cron",
    },
  );

  // ── 5h. Cron F28: stock:sync:oblio — */15 * * * * (Plan FAZA 8g) ─────────
  const stockSyncQueue = createQueue(QUEUES.E4_STOCK_SYNC_OBLIO, { db: REDIS_DB_E4 });
  await stockSyncQueue.add(
    "sync",
    {},
    {
      repeat: { pattern: "*/15 * * * *" },
      jobId: "stock:sync:oblio:cron",
    },
  );

  // ── 5i. Cron J46: audit:chain:verify — 0 6 * * * (Plan L2133) ────────────
  const auditChainVerifyQueue = createQueue(QUEUES.E4_AUDIT_CHAIN_VERIFY, { db: REDIS_DB_E4 });
  await auditChainVerifyQueue.add(
    "verify",
    {},
    {
      repeat: { pattern: "0 6 * * *" },
      jobId: "audit:chain:verify:cron",
    },
  );

  // ── 5j. Cron J47: audit:data:anonymize — 0 2 * * 0 (duminică, Plan L2134) ─
  const auditAnonymizeQueue = createQueue(QUEUES.E4_AUDIT_DATA_ANONYMIZE, { db: REDIS_DB_E4 });
  await auditAnonymizeQueue.add(
    "anonymize",
    {},
    {
      repeat: { pattern: "0 2 * * 0" },
      jobId: "audit:data:anonymize:cron",
    },
  );

  // ── 6. Queue depth monitor pentru cozile E4 ──────────────────────────────
  const e4QueueNames = [
    QUEUES.E4_REVOLUT_WEBHOOK_INGEST,
    QUEUES.E4_REVOLUT_TRANSACTION_PROCESS,
    QUEUES.E4_REVOLUT_PAYMENT_RECORD,
    QUEUES.E4_REVOLUT_REFUND_PROCESS,
    QUEUES.E4_REVOLUT_BALANCE_SYNC,
    QUEUES.E4_REVOLUT_WEBHOOK_VALIDATE,
    QUEUES.E4_PAYMENT_RECONCILE_AUTO,
    QUEUES.E4_PAYMENT_RECONCILE_FUZZY,
    QUEUES.E4_PAYMENT_RECONCILE_MANUAL,
    QUEUES.E4_PAYMENT_BALANCE_UPDATE,
    QUEUES.E4_PAYMENT_OVERDUE_DETECT,
    QUEUES.E4_PAYMENT_OVERDUE_ESCALATE,
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
    // E22-E27 Sameday
    QUEUES.E4_SAMEDAY_AWB_CREATE,
    QUEUES.E4_SAMEDAY_STATUS_POLL,
    QUEUES.E4_SAMEDAY_STATUS_PROCESS,
    QUEUES.E4_SAMEDAY_COD_PROCESS,
    QUEUES.E4_SAMEDAY_RETURN_INITIATE,
    QUEUES.E4_SAMEDAY_PICKUP_SCHEDULE,
    // G32-G36 Contracte DocuSign
    QUEUES.E4_CONTRACT_GENERATE,
    QUEUES.E4_CONTRACT_CLAUSES_SELECT,
    QUEUES.E4_CONTRACT_DOCUSIGN_SEND,
    QUEUES.E4_CONTRACT_STATUS_POLL,
    QUEUES.E4_CONTRACT_SIGNED_PROCESS,
    // F28-F31 Stock Sync Oblio
    QUEUES.E4_STOCK_SYNC_OBLIO,
    QUEUES.E4_STOCK_DEDUCT,
    QUEUES.E4_STOCK_RETURN,
    QUEUES.E4_STOCK_LOW_ALERT,
    // H37-H38 Returns
    QUEUES.E4_RETURN_INITIATE,
    QUEUES.E4_RETURN_PROCESS,
    // I39-I44 AlertNeuron
    QUEUES.E4_ALERT_PAYMENT,
    QUEUES.E4_ALERT_DELIVERY,
    QUEUES.E4_ALERT_CREDIT,
    QUEUES.E4_ALERT_CONTRACT,
    QUEUES.E4_ALERT_STOCK,
    QUEUES.E4_ALERT_DISPATCH,
    // J45-J47 Audit Hash-Chain
    QUEUES.E4_AUDIT_LOG_WRITE,
    QUEUES.E4_AUDIT_CHAIN_VERIFY,
    QUEUES.E4_AUDIT_DATA_ANONYMIZE,
    // K48-K53 HITL
    QUEUES.E4_HITL_CREDIT_OVERRIDE,
    QUEUES.E4_HITL_CREDIT_LIMIT,
    QUEUES.E4_HITL_REFUND_LARGE,
    QUEUES.E4_HITL_PAYMENT_INVESTIGATION,
    QUEUES.E4_HITL_TASK_RESOLVE,
    QUEUES.E4_HITL_ESCALATION_OVERDUE,
  ];

  const stopQueueMonitor = startQueueDepthMonitor({ queueNames: e4QueueNames });

  // ── 7. Health server ─────────────────────────────────────────────────────
  const healthServer = createHealthServer(PORT, () => ({
    ok: true,
    service: "worker-e4-postsale",
    workerInstances: workers.length,
    registryQueues: e4QueueNames.length,
    redisDb: REDIS_DB_E4,
  }));

  // ── 8. Graceful shutdown ─────────────────────────────────────────────────
  const shutdown = async () => {
    svcLog.info("shutdown starting");
    await stopQueueMonitor();
    await Promise.allSettled(workers.map((w) => w.close()));
    await balanceSyncQueue.close();
    await overdueDetectQueue.close();
    await creditRefreshQueue.close();
    await reservationExpireQueue.close();
    await samedayPollQueue.close();
    await samedayPickupQueue.close();
    await contractPollQueue.close();
    await stockSyncQueue.close();
    await auditChainVerifyQueue.close();
    await auditAnonymizeQueue.close();
    healthServer.close();
    await redis.quit();
    process.exit(0);
  };

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

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());

  svcLog.info(
    {
      workers: workers.length,
      port: PORT,
      redisDb: REDIS_DB_E4,
    },
    "worker-e4-postsale started",
  );
}

try {
  await bootstrap();
} catch (err) {
  const e = err instanceof Error ? err : new Error(String(err));
  svcLog.error({ err: e, ...enrichError(e, { scope: "bootstrap" }) }, "worker-e4-postsale fatal");
  process.exit(1);
}
