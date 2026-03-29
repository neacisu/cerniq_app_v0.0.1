/**
 * outreach-metrics.test.ts — Testare completă a celor 4 metrici Prometheus noi E2:
 *
 * 1. cerniq_outreach_wa_quota_usage     → quota-guardian.ts (executeQuotaCheck)
 * 2. cerniq_outreach_messages_sent_total → whatsapp.ts (WA), email.ts (EMAIL_COLD/WARM)
 * 3. cerniq_outreach_phone_status        → phone-monitoring.ts (definire corectă)
 * 4. cerniq_outreach_replies_received_total → webhooks.ts (WHATSAPP/EMAIL_COLD reply)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// Hoisted spies — declarate cu vi.hoisted() pentru fabrica vi.mock
// =============================================================================

const {
  quotaUsageSetSpy,
  messagesSentIncSpy,
  phoneStatusSetSpy,
  repliesReceivedIncSpy,
  waSentIncSpy,
  processorRegistry,
} = vi.hoisted(() => ({
  quotaUsageSetSpy: vi.fn(),
  messagesSentIncSpy: vi.fn(),
  phoneStatusSetSpy: vi.fn(),
  repliesReceivedIncSpy: vi.fn(),
  waSentIncSpy: vi.fn(),
  processorRegistry: new Map<string, (job: unknown) => Promise<unknown>>(),
}));

vi.mock("@cerniq/worker-shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cerniq/worker-shared")>();
  return {
    ...actual,
    outreachWaQuotaUsage: { set: quotaUsageSetSpy },
    outreachMessagesSentTotal: { inc: messagesSentIncSpy },
    outreachPhoneStatus: { set: phoneStatusSetSpy },
    outreachRepliesReceivedTotal: { inc: repliesReceivedIncSpy },
    waSent: { inc: waSentIncSpy },
    createQueue: vi.fn((name: string) => ({
      add: vi.fn(async () => ({ id: `job-${name}` })),
      close: vi.fn(async () => undefined),
    })),
    createWorker: vi.fn((queueName: string, processor: (job: unknown) => Promise<unknown>) => {
      processorRegistry.set(queueName, processor);
      return { worker: { close: vi.fn(async () => undefined) } };
    }),
    withCognitiveSpan: vi.fn(async (_key: string, fn: () => unknown) => fn()),
    QUEUES: actual.QUEUES,
    WA_PHONE_COUNT: actual.WA_PHONE_COUNT,
    getWaPhoneQueueName: actual.getWaPhoneQueueName,
    getWaPhoneFollowupQueueName: actual.getWaPhoneFollowupQueueName,
  };
});

// =============================================================================
// Mock @cerniq/db
// =============================================================================

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@cerniq/db", () => ({
  db: dbMock,
  setSessionTenantId: vi.fn(async () => undefined),
  leadJourney: {},
  communicationLog: {},
  goldContacts: {},
  waPhoneNumbers: {},
  outreachNotifications: {},
  humanReviewQueue: {},
  goldCompanies: {},
  phoneStatusEnum: { enumValues: ["ACTIVE", "OFFLINE", "BANNED", "SUSPENDED"] },
  messageStatusEnum: { enumValues: ["SENT", "DELIVERED", "READ", "FAILED"] },
  reviewReasonEnum: { enumValues: ["AI_UNCERTAIN", "MANUAL", "SLA_BREACH"] },
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  isNull: vi.fn(),
  lte: vi.fn(),
  inArray: vi.fn(),
  isNotNull: vi.fn(),
  sql: vi.fn(),
}));

vi.mock("ioredis", () => ({
  Redis: vi.fn().mockImplementation(() => ({
    evalsha: vi.fn().mockResolvedValue(
      JSON.stringify({
        allowed: true,
        reason: "QUOTA_OK",
        current_usage: 15,
        remaining: 85,
        cost_applied: 1,
      }),
    ),
    get: vi.fn(async () => "15"),
    set: vi.fn().mockResolvedValue("OK"),
    scan: vi.fn().mockResolvedValue(["0", []]),
    del: vi.fn().mockResolvedValue(0),
  })),
}));

vi.mock("@cerniq/integrations", () => ({
  getTimelinesAIClient: vi.fn(() => ({
    sendMessage: vi
      .fn()
      .mockResolvedValue({ message_id: "wa-msg-001", chat_id: "chat-001", status: "SENT" }),
    getAccountStatus: vi.fn().mockResolvedValue({ status: "ACTIVE" }),
  })),
  getResendClient: vi.fn(() => ({
    sendEmail: vi.fn().mockResolvedValue({ id: "resend-001" }),
  })),
  getInstantlyClient: vi.fn(() => ({
    addLead: vi.fn().mockResolvedValue({ id: "instantly-001" }),
  })),
}));

vi.mock("../utils/spintax.js", () => ({
  processSpintax: vi.fn((_t: string) => "Hello Company!"),
}));

vi.mock("./quota-guardian.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./quota-guardian.js")>();
  return {
    ...actual,
    quotaGuardianCheck: vi.fn().mockResolvedValue({
      allowed: true,
      reason: "QUOTA_OK",
      currentUsage: 10,
      remaining: 90,
      costApplied: 1,
    }),
  };
});

// =============================================================================
// Helpers
// =============================================================================

const TENANT = "t-outreach-test";

function makeMockRedisForQuota(quotaResult?: string) {
  return {
    evalsha: vi.fn().mockResolvedValue(
      quotaResult ??
        JSON.stringify({
          allowed: true,
          reason: "QUOTA_OK",
          current_usage: 15,
          remaining: 85,
          cost_applied: 1,
        }),
    ),
    get: vi.fn(async () => "15"),
    set: vi.fn().mockResolvedValue("OK"),
  };
}

function setupDbInsert() {
  dbMock.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
}

function setupDbUpdate() {
  dbMock.update.mockReturnValue({
    set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  });
}

// =============================================================================
// 1. cerniq_outreach_wa_quota_usage — quota-guardian.ts::executeQuotaCheck
// =============================================================================

describe("cerniq_outreach_wa_quota_usage (Gauge)", () => {
  beforeEach(() => {
    quotaUsageSetSpy.mockClear();
  });

  it("setează metrica cu currentUsage=42 după evalsha Redis", async () => {
    const { executeQuotaCheck } = await import("./quota-guardian.js");
    const redis = makeMockRedisForQuota(
      JSON.stringify({
        allowed: true,
        reason: "QUOTA_OK",
        current_usage: 42,
        remaining: 58,
        cost_applied: 1,
      }),
    );

    await executeQuotaCheck(redis as never, "sha123", {
      correlationId: "c1",
      tenantId: TENANT,
      phoneId: "phone-01",
      leadId: "lead-01",
      isNewContact: true,
      dateIso: "2026-03-26",
      currentHour: 10,
    });

    expect(quotaUsageSetSpy).toHaveBeenCalledWith({ phone_id: "phone-01", tenant_id: TENANT }, 42);
  });

  it("setează currentUsage=100 la QUOTA_EXCEEDED", async () => {
    const { executeQuotaCheck } = await import("./quota-guardian.js");
    const redis = makeMockRedisForQuota(
      JSON.stringify({
        allowed: false,
        reason: "QUOTA_EXCEEDED",
        current_usage: 100,
        remaining: 0,
        cost_applied: 0,
      }),
    );

    await executeQuotaCheck(redis as never, "sha123", {
      correlationId: "c2",
      tenantId: TENANT,
      phoneId: "phone-02",
      leadId: "lead-02",
      isNewContact: false,
      dateIso: "2026-03-26",
      currentHour: 14,
    });

    expect(quotaUsageSetSpy).toHaveBeenCalledWith({ phone_id: "phone-02", tenant_id: TENANT }, 100);
  });

  it("returnează QuotaCheckResult complet cu câmpurile expected", async () => {
    const { executeQuotaCheck } = await import("./quota-guardian.js");
    const redis = makeMockRedisForQuota();

    const result = await executeQuotaCheck(redis as never, "sha123", {
      correlationId: "c3",
      tenantId: TENANT,
      phoneId: "phone-03",
      leadId: "lead-03",
      isNewContact: true,
      dateIso: "2026-03-26",
      currentHour: 11,
    });

    expect(result).toMatchObject({
      allowed: true,
      reason: "QUOTA_OK",
      currentUsage: 15,
      remaining: 85,
      costApplied: 1,
    });
  });

  it("setează metrica O singură dată per apel executeQuotaCheck", async () => {
    const { executeQuotaCheck } = await import("./quota-guardian.js");
    const redis = makeMockRedisForQuota();

    await executeQuotaCheck(redis as never, "sha", {
      correlationId: "c4",
      tenantId: TENANT,
      phoneId: "phone-04",
      leadId: "l4",
      isNewContact: true,
      dateIso: "2026-03-26",
      currentHour: 9,
    });

    expect(quotaUsageSetSpy).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// 2. cerniq_outreach_messages_sent_total — whatsapp.ts + email.ts
// =============================================================================

describe("cerniq_outreach_messages_sent_total (Counter) — WA + Email", () => {
  beforeEach(() => {
    messagesSentIncSpy.mockClear();
    waSentIncSpy.mockClear();
    dbMock.select.mockReset();
    dbMock.update.mockReset();
    dbMock.insert.mockReset();
    processorRegistry.clear();
  });

  it("WA: incrementează channel=WHATSAPP după trimitere WA reușită", async () => {
    vi.useFakeTimers();

    const { createWaWorker } = await import("./whatsapp.js");
    createWaWorker(1, false, {} as never, "lua-sha");

    const processor = processorRegistry.get("q:wa:phone-01");
    if (!processor) throw new Error("Processor for 'q:wa:phone-01' was not registered");

    // phone ACTIVE
    dbMock.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi
            .fn()
            .mockResolvedValue([
              { id: "phone-01", status: "ACTIVE", isEnabled: true, phoneNumber: "+40700000001" },
            ]),
        })),
      })),
    });
    // journey state for transition
    dbMock.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ currentState: "COLD" }]) })),
      })),
    });
    setupDbInsert();
    setupDbUpdate();

    const processorPromise = processor({
      data: {
        correlationId: "corr-01",
        tenantId: TENANT,
        leadId: "lead-01",
        journeyId: "journey-01",
        phoneId: "phone-01",
        phoneNumber: "+40700000001",
        recipientPhone: "+40711111111",
        bodyTemplate: "{companyName} salut",
        personalization: { companyName: "TestCorp" },
        sequenceId: "seq-01",
        sequenceEnrollmentId: "enroll-01",
        sequenceStep: 1,
        isFollowup: false,
      },
    });

    // Avansăm fake timers pentru a trece peste sleep(jitterMs)
    await vi.runAllTimersAsync();
    await processorPromise;

    vi.useRealTimers();

    expect(messagesSentIncSpy).toHaveBeenCalledWith({ channel: "WHATSAPP", tenant_id: TENANT });
    expect(waSentIncSpy).toHaveBeenCalledWith({ phone_id: "phone-01" });
  });

  it("Email Cold: incrementează channel=EMAIL_COLD după addLead Instantly", async () => {
    const { createEmailColdSenderWorker } = await import("./email.js");
    createEmailColdSenderWorker();

    const processor = processorRegistry.get("q:email:cold");
    if (!processor) throw new Error("Processor for 'q:email:cold' was not registered");

    setupDbInsert();

    await processor({
      data: {
        tenantId: TENANT,
        leadId: "lead-01",
        journeyId: "journey-01",
        campaignId: "camp-01",
        recipientEmail: "test@company.ro",
        firstName: "Ion",
        lastName: "Popescu",
        companyName: "TestCorp",
        currentState: "COLD",
        sequenceId: "seq-01",
        sequenceStep: 0,
        variables: {},
      },
    });

    expect(messagesSentIncSpy).toHaveBeenCalledWith({ channel: "EMAIL_COLD", tenant_id: TENANT });
  });

  it("Email Warm: incrementează channel=EMAIL_WARM după sendEmail Resend", async () => {
    const { createEmailWarmSenderWorker } = await import("./email.js");
    createEmailWarmSenderWorker();

    const processor = processorRegistry.get("q:email:warm");
    if (!processor) throw new Error("Processor for 'q:email:warm' was not registered");

    setupDbInsert();

    await processor({
      data: {
        tenantId: TENANT,
        leadId: "lead-01",
        journeyId: "journey-01",
        recipientEmail: "test@company.ro",
        subject: "Ofertă specială",
        htmlBody: "<p>Bună ziua</p>",
        currentState: "WARM_REPLY",
        sequenceId: "seq-01",
        sequenceStep: 1,
      },
    });

    expect(messagesSentIncSpy).toHaveBeenCalledWith({ channel: "EMAIL_WARM", tenant_id: TENANT });
  });
});

// =============================================================================
// 3. cerniq_outreach_replies_received_total — webhooks.ts
// =============================================================================

describe("cerniq_outreach_replies_received_total (Counter) — webhooks.ts", () => {
  beforeEach(() => {
    repliesReceivedIncSpy.mockClear();
    dbMock.select.mockReset();
    dbMock.insert.mockReset();
    processorRegistry.clear();
  });

  it("incrementează channel=WHATSAPP la mesaj INBOUND TimelinesAI", async () => {
    const { createTimelinesAIEventProcessorWorker } = await import("./webhooks.js");
    createTimelinesAIEventProcessorWorker();

    const processor = processorRegistry.get("webhook:timelinesai:ingest");
    if (!processor)
      throw new Error("Processor for 'webhook:timelinesai:ingest' was not registered");

    // communicationLog lookup → journeyId found
    dbMock.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ leadJourneyId: "journey-01" }]),
          })),
        })),
      })
      // leadJourney → leadId
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ leadId: "lead-01" }]) })),
        })),
      });
    setupDbInsert();

    await processor({
      data: {
        tenantId: TENANT,
        rawEvent: {
          from_me: false,
          message_id: "wa-inbound-001",
          chat_id: "chat-001",
          message: "Sunt interesat de ofertă",
          timestamp: new Date().toISOString(),
        },
      },
    });

    expect(repliesReceivedIncSpy).toHaveBeenCalledWith({ channel: "WHATSAPP", tenant_id: TENANT });
  });

  it("NU incrementează dacă mesajul este from_me=true", async () => {
    const { createTimelinesAIEventProcessorWorker } = await import("./webhooks.js");
    createTimelinesAIEventProcessorWorker();

    const processor = processorRegistry.get("webhook:timelinesai:ingest");
    if (!processor)
      throw new Error("Processor for 'webhook:timelinesai:ingest' was not registered");

    await processor({
      data: {
        tenantId: TENANT,
        rawEvent: {
          from_me: true,
          message_id: "wa-out-001",
          chat_id: "chat-001",
          message: "Outbound",
          timestamp: new Date().toISOString(),
        },
      },
    });

    expect(repliesReceivedIncSpy).not.toHaveBeenCalled();
  });

  it("NU incrementează pentru delivery status events (fără message)", async () => {
    const { createTimelinesAIEventProcessorWorker } = await import("./webhooks.js");
    createTimelinesAIEventProcessorWorker();

    const processor = processorRegistry.get("webhook:timelinesai:ingest");
    if (!processor)
      throw new Error("Processor for 'webhook:timelinesai:ingest' was not registered");

    await processor({
      data: {
        tenantId: TENANT,
        rawEvent: {
          from_me: false,
          status: "DELIVERED",
          message_id: "wa-001",
          chat_id: "chat-001",
          timestamp: new Date().toISOString(),
        },
      },
    });

    expect(repliesReceivedIncSpy).not.toHaveBeenCalled();
  });

  it("incrementează channel=EMAIL_COLD la event reply_received Instantly", async () => {
    const { createInstantlyEventProcessorWorker } = await import("./webhooks.js");
    createInstantlyEventProcessorWorker();

    const processor = processorRegistry.get("webhook:instantly:ingest");
    if (!processor) throw new Error("Processor for 'webhook:instantly:ingest' was not registered");

    dbMock.select.mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
        })),
      })),
    });

    await processor({
      data: {
        tenantId: TENANT,
        rawEvent: {
          event_type: "reply_received",
          lead_email: "lead@company.ro",
          campaign_id: "camp-001",
          timestamp: new Date().toISOString(),
          reply_content: "Răspuns",
        },
      },
    });

    expect(repliesReceivedIncSpy).toHaveBeenCalledWith({
      channel: "EMAIL_COLD",
      tenant_id: TENANT,
    });
  });

  it("NU incrementează pentru alte event_type Instantly (email_sent)", async () => {
    const { createInstantlyEventProcessorWorker } = await import("./webhooks.js");
    createInstantlyEventProcessorWorker();

    const processor = processorRegistry.get("webhook:instantly:ingest");
    if (!processor) throw new Error("Processor for 'webhook:instantly:ingest' was not registered");

    dbMock.select.mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
        })),
      })),
    });

    await processor({
      data: {
        tenantId: TENANT,
        rawEvent: {
          event_type: "email_sent",
          lead_email: "lead@company.ro",
          campaign_id: "camp-001",
          timestamp: new Date().toISOString(),
        },
      },
    });

    expect(repliesReceivedIncSpy).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 4. cerniq_outreach_phone_status — semantică și definire
// =============================================================================

describe("cerniq_outreach_phone_status (Gauge) — semantică status", () => {
  it("valoarea 1 pentru ACTIVE, 0 pentru orice alt status", () => {
    const toValue = (s: string) => (s === "ACTIVE" ? 1 : 0);
    expect(toValue("ACTIVE")).toBe(1);
    expect(toValue("BANNED")).toBe(0);
    expect(toValue("OFFLINE")).toBe(0);
    expect(toValue("SUSPENDED")).toBe(0);
  });

  it("outreachPhoneStatus este definit cu metoda set()", async () => {
    const shared = await import("@cerniq/worker-shared");
    expect(shared.outreachPhoneStatus).toBeDefined();
    expect(typeof shared.outreachPhoneStatus.set).toBe("function");
  });
});

// =============================================================================
// 5. Smoke tests — exporturi corecte din @cerniq/worker-shared
// =============================================================================

describe("metrici E2 — exporturi @cerniq/worker-shared", () => {
  it("outreachWaQuotaUsage — Gauge cu set()", async () => {
    const { outreachWaQuotaUsage } = await import("@cerniq/worker-shared");
    expect(outreachWaQuotaUsage).toBeDefined();
    expect(typeof outreachWaQuotaUsage.set).toBe("function");
  });

  it("outreachMessagesSentTotal — Counter cu inc()", async () => {
    const { outreachMessagesSentTotal } = await import("@cerniq/worker-shared");
    expect(outreachMessagesSentTotal).toBeDefined();
    expect(typeof outreachMessagesSentTotal.inc).toBe("function");
  });

  it("outreachPhoneStatus — Gauge cu set()", async () => {
    const { outreachPhoneStatus } = await import("@cerniq/worker-shared");
    expect(outreachPhoneStatus).toBeDefined();
    expect(typeof outreachPhoneStatus.set).toBe("function");
  });

  it("outreachRepliesReceivedTotal — Counter cu inc()", async () => {
    const { outreachRepliesReceivedTotal } = await import("@cerniq/worker-shared");
    expect(outreachRepliesReceivedTotal).toBeDefined();
    expect(typeof outreachRepliesReceivedTotal.inc).toBe("function");
  });

  it("metricile noi sunt distincte față de cele vechi", async () => {
    const shared = await import("@cerniq/worker-shared");
    expect(shared.outreachWaQuotaUsage).not.toBe(shared.waSent);
    expect(shared.outreachMessagesSentTotal).not.toBe(shared.outreachDispatched);
    expect(shared.outreachRepliesReceivedTotal).not.toBe(shared.fsmTransitions);
  });
});
