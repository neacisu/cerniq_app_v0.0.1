/**
 * TimelinesAI Client Tests
 * Source: etapa2-workers-C-whatsapp.md sec. 1.2, 2-6
 *
 * All HTTP calls are mocked — no real TimelinesAI API is called.
 */
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { TimelinesAIClient, normalizeTimelinesAIEvent } from "../timelinesai/client.js";
import type { TimelinesAIWebhookPayload } from "../timelinesai/types.js";

// Mock fetch globally
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
  process.env.TIMELINESAI_API_URL = "https://api.timelines.ai/v1";
  process.env.TIMELINESAI_API_KEY = "test-api-key";
  process.env.TIMELINESAI_WEBHOOK_SECRET = "test-webhook-secret";
  return new TimelinesAIClient();
}

describe("TimelinesAIClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendMessage", () => {
    it("sends a message and returns message_id and chat_id", async () => {
      const mockResponse = {
        message_id: "msg-123",
        chat_id: "chat-456",
        chat_url: "https://chat.timelines.ai/chat-456",
        status: "SENT",
      };
      mockFetch.mockResolvedValueOnce(makeJsonResponse(mockResponse));

      const client = makeClient();
      const result = await client.sendMessage({
        phone: "+40712345678",
        recipient: "+40798765432",
        message: "Hello World",
      });

      expect(result.message_id).toBe("msg-123");
      expect(result.chat_id).toBe("chat-456");
      expect(result.status).toBe("SENT");

      const [calledUrl, calledOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toContain("/messages/send");
      expect(calledOptions.method).toBe("POST");
      const body = JSON.parse(calledOptions.body as string);
      expect(body.phone).toBe("+40712345678");
      expect(body.recipient).toBe("+40798765432");
    });

    it("retries on 429 rate limit response", async () => {
      vi.useFakeTimers();

      const rateLimitResponse = makeJsonResponse({ error: "rate limited" }, 429);
      const successResponse = makeJsonResponse({
        message_id: "msg-retry",
        chat_id: "c1",
        status: "SENT",
      });

      mockFetch.mockResolvedValueOnce(rateLimitResponse).mockResolvedValueOnce(successResponse);

      const client = makeClient();
      const sendPromise = client.sendMessage({
        phone: "+40712345678",
        recipient: "+40798765432",
        message: "test",
      });

      // Advance timer past retry delay (60s)
      await vi.advanceTimersByTimeAsync(65000);
      const result = await sendPromise;

      expect(result.message_id).toBe("msg-retry");
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("throws on 4xx without retry", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ error: "not found" }, 404));

      const client = makeClient();
      await expect(
        client.sendMessage({ phone: "+40712345678", recipient: "+40798765432", message: "test" }),
      ).rejects.toThrow("404");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getChatHistory", () => {
    it("fetches chat history with default limit and offset", async () => {
      const mockMessages = [
        {
          id: "m1",
          body: "hello",
          from_me: true,
          timestamp: 1700000000,
          chat_id: "c1",
          author: "me",
          type: "text",
        },
      ];
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ messages: mockMessages, total: 1 }));

      const client = makeClient();
      const result = await client.getChatHistory({ chat_id: "chat-abc" });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe("m1");

      const [calledUrl] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toContain("/chats/chat-abc/messages");
      expect(calledUrl).toContain("limit=50");
      expect(calledUrl).toContain("offset=0");
    });

    it("accepts custom limit and offset", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ messages: [], total: 0 }));
      const client = makeClient();
      await client.getChatHistory({ chat_id: "c1", limit: 10, offset: 20 });

      const [calledUrl] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toContain("limit=10");
      expect(calledUrl).toContain("offset=20");
    });
  });

  describe("getAccountStatus", () => {
    it("returns account status", async () => {
      const mockStatus = {
        account_id: "acc-1",
        phone: "+40712345678",
        status: "ACTIVE",
      };
      mockFetch.mockResolvedValueOnce(makeJsonResponse(mockStatus));

      const client = makeClient();
      const result = await client.getAccountStatus("acc-1");

      expect(result.status).toBe("ACTIVE");
      expect(result.phone).toBe("+40712345678");
    });

    it("reports OFFLINE account status", async () => {
      const mockStatus = { account_id: "acc-2", phone: "+40712345679", status: "DISCONNECTED" };
      mockFetch.mockResolvedValueOnce(makeJsonResponse(mockStatus));

      const client = makeClient();
      const result = await client.getAccountStatus("acc-2");
      expect(result.status).toBe("DISCONNECTED");
    });
  });

  describe("getChats", () => {
    it("returns list of chats for an account", async () => {
      const mockChats = [
        {
          chat_id: "c1",
          contact_phone: "+40798765432",
          last_message: "test",
          last_message_time: 1700000000,
          unread_count: 0,
        },
      ];
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ chats: mockChats, total: 1 }));

      const client = makeClient();
      const result = await client.getChats("acc-1");
      expect(result.chats).toHaveLength(1);
      expect(result.chats[0].chat_id).toBe("c1");
    });
  });
});

describe("normalizeTimelinesAIEvent", () => {
  it("produces valid SystemEvent from webhook payload (ADR-0061)", () => {
    const payload: TimelinesAIWebhookPayload = {
      event: "message.received",
      message_id: "tai-msg-999",
      chat_id: "chat-123",
      from_me: false,
      author: "+40798765432",
      body: "Sunt interesat",
      timestamp: 1700000000,
      account_phone: "+40712345678",
      type: "text",
    };

    const event = normalizeTimelinesAIEvent(payload);

    expect(event.eventId).toBe("tai-tai-msg-999");
    expect(event.source).toBe("timelinesai");
    expect(event.eventType).toBe("message.received");
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(event.rawEvent).toStrictEqual(payload);
    // No extra fields beyond the SystemEvent interface
    expect(Object.keys(event)).toEqual([
      "eventId",
      "source",
      "eventType",
      "timestamp",
      "payload",
      "rawEvent",
    ]);
  });
});
