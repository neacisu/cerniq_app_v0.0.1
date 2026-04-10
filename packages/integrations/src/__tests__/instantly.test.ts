/**
 * Instantly.ai Client Tests
 * Source: etapa2-workers-D-E-email.md sec. 1.3, 2-4
 *
 * All HTTP calls are mocked — no real Instantly API is called.
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

import { InstantlyClient, normalizeInstantlyEvent, BOUNCE_THRESHOLD } from "../instantly/client.js";
import type { InstantlyWebhookPayload } from "../instantly/types.js";

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
  process.env.INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";
  process.env.INSTANTLY_API_KEY = "test-instantly-key";
  return new InstantlyClient();
}

describe("InstantlyClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObsInfo.mockClear();
    mockObsError.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("addLead", () => {
    it("adds a lead to campaign and returns lead_id", async () => {
      const mockResponse = { lead_id: "lead-abc", status: "ADDED" };
      mockFetch.mockResolvedValueOnce(makeJsonResponse(mockResponse));

      const client = makeClient();
      const result = await client.addLead({
        campaign_id: "camp-1",
        email: "test@example.com",
        first_name: "Ion",
        last_name: "Popescu",
        company_name: "Firma SRL",
        variables: { lead_id: "lead-123" },
      });

      expect(result.lead_id).toBe("lead-abc");
      expect(result.status).toBe("ADDED");

      const [calledUrl, calledOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toContain("/lead/add");
      const body = JSON.parse(calledOptions.body as string);
      expect(body.campaign_id).toBe("camp-1");
      expect(body.email).toBe("test@example.com");
      expect(body.first_name).toBe("Ion");

      expect(mockObsInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "instantly_request_start",
          path: "/lead/add",
          campaignId: "camp-1",
        }),
      );
      expect(mockObsInfo).toHaveBeenCalledWith(
        expect.objectContaining({ event: "instantly_request_success", campaignId: "camp-1" }),
      );
    });

    it("handles ALREADY_EXISTS response gracefully", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({ lead_id: "l1", status: "ALREADY_EXISTS" }),
      );
      const client = makeClient();
      const result = await client.addLead({ campaign_id: "c1", email: "dup@example.com" });
      expect(result.status).toBe("ALREADY_EXISTS");
    });

    it("throws on 4xx without retry", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ error: "bad request" }, 400));
      const client = makeClient();
      await expect(client.addLead({ campaign_id: "c1", email: "bad@example.com" })).rejects.toThrow(
        "400",
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getCampaigns", () => {
    it("fetches list of campaigns with analytics", async () => {
      const mockCampaigns = [
        {
          id: "camp-1",
          name: "Test Campaign",
          status: "ACTIVE",
          daily_limit: 50,
          sent: 100,
          opened: 40,
          clicked: 10,
          replied: 5,
          bounced: 2,
          bounce_rate: 0.02,
          created_at: "2026-01-01",
        },
      ];
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ campaigns: mockCampaigns, total: 1 }));

      const client = makeClient();
      const result = await client.getCampaigns();
      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0].bounce_rate).toBe(0.02);
    });
  });

  describe("pauseCampaign (circuit breaker ADR-0066)", () => {
    it("pauses campaign when called", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse({}));
      const client = makeClient();
      await client.pauseCampaign("camp-1");
      const [calledUrl] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toContain("camp-1/pause");
    });
  });

  describe("BOUNCE_THRESHOLD", () => {
    it("bounce threshold is exactly 3% (ADR-0066)", () => {
      expect(BOUNCE_THRESHOLD).toBe(0.03);
    });
  });
});

describe("normalizeInstantlyEvent", () => {
  const events: Array<InstantlyWebhookPayload["event"]> = [
    "email_sent",
    "email_opened",
    "reply_received",
    "email_bounced",
    "lead_unsubscribed",
  ];

  it.each(events)("normalizes %s event to SystemEvent (ADR-0061)", (eventType) => {
    const payload: InstantlyWebhookPayload = {
      event: eventType,
      campaign_id: "camp-1",
      lead_email: "test@example.com",
      timestamp: "2026-01-01T10:00:00Z",
    };

    const event = normalizeInstantlyEvent(payload);

    expect(event.eventId).toMatch(/^ins-\d+$/);
    expect(event.source).toBe("instantly");
    expect(event.eventType).toBe(eventType);
    expect(event.rawEvent).toStrictEqual(payload);
  });
});
