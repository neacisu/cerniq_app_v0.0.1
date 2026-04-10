/**
 * Resend Client Tests
 * Source: etapa2-workers-D-E-email.md sec. 6-8
 *
 * All HTTP calls are mocked — no real Resend API is called.
 * Svix signature verification is also mocked.
 */
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

const { mockObsInfo, mockObsError } = vi.hoisted(() => ({
  mockObsInfo: vi.fn(),
  mockObsError: vi.fn(),
}));

vi.mock("@cerniq/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: mockObsInfo,
    error: mockObsError,
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { ResendClient, normalizeResendEvent, WARM_ALLOWED_STAGES } from "../resend/client.js";
import type { ResendWebhookPayload } from "../resend/types.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

function makeClient() {
  process.env.RESEND_API_URL = "https://api.resend.com";
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.RESEND_WEBHOOK_SECRET = "whsec_test";
  return new ResendClient();
}

describe("ResendClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObsInfo.mockClear();
    mockObsError.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendEmail", () => {
    it("sends email and returns email ID", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ id: "email-xyz" }));

      const client = makeClient();
      const result = await client.sendEmail({
        to: "contact@firma.ro",
        subject: "Oferta pentru firma",
        html: "<p>Buna ziua!</p>",
        tags: [
          { name: "lead_id", value: "lead-123" },
          { name: "tenant_id", value: "tenant-456" },
        ],
      });

      expect(result.id).toBe("email-xyz");

      expect(mockObsInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "resend_request_success",
          path: "/emails",
          emailId: "email-xyz",
        }),
      );
      const logged = JSON.stringify(mockObsInfo.mock.calls);
      expect(logged).not.toContain("Oferta");

      const [calledUrl, calledOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toContain("/emails");
      const body = JSON.parse(calledOptions.body as string);
      expect(body.to).toBe("contact@firma.ro");
      expect(body.from).toContain("Cerniq Sales");
      expect(body.tags).toContainEqual({ name: "lead_id", value: "lead-123" });
    });

    it("includes text content when provided", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ id: "email-txt" }));
      const client = makeClient();
      await client.sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>HTML</p>",
        text: "Plain text",
      });
      const [, calledOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(calledOptions.body as string);
      expect(body.text).toBe("Plain text");
    });

    it("throws on 4xx without retry", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ message: "bad request" }, 400));
      const client = makeClient();
      await expect(client.sendEmail({ to: "bad", subject: "s", html: "h" })).rejects.toThrow("400");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("WARM_ALLOWED_STAGES (ADR-0059)", () => {
    it("contains exactly WARM_REPLY and NEGOTIATION", () => {
      expect(WARM_ALLOWED_STAGES).toContain("WARM_REPLY");
      expect(WARM_ALLOWED_STAGES).toContain("NEGOTIATION");
      expect(WARM_ALLOWED_STAGES).toHaveLength(2);
    });
  });
});

describe("normalizeResendEvent", () => {
  const events: Array<ResendWebhookPayload["type"]> = [
    "email.sent",
    "email.delivered",
    "email.bounced",
    "email.opened",
    "email.clicked",
  ];

  it.each(events)("normalizes %s event to SystemEvent (ADR-0061)", (eventType) => {
    const payload: ResendWebhookPayload = {
      type: eventType,
      data: {
        email_id: "resend-abc-123",
        to: ["test@example.com"],
        created_at: "2026-01-01T10:00:00Z",
      },
    };

    const event = normalizeResendEvent(payload);

    expect(event.eventId).toBe("resend-resend-abc-123");
    expect(event.source).toBe("resend");
    expect(event.eventType).toBe(eventType);
    expect(event.rawEvent).toStrictEqual(payload);
  });
});
