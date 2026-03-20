/**
 * TimelinesAI API Client
 * Source: etapa2-workers-C-whatsapp.md sec. 1.2, 2-5
 *
 * Rate limits per documentation:
 *   sendMessage: 50/min per account
 *   getChatHistory: 100/min
 *   getChats: 20/min
 *
 * Retry strategy (etapa2-workers-overview.md sec. 6):
 *   429: 5 retries, fixed 60s delay
 *   5xx: 3 retries, exponential (2s, 4s, 8s)
 *   4xx: 0 retries, throw immediately
 */
import Bottleneck from "bottleneck";
import type {
  SendMessageRequest,
  SendMessageResponse,
  GetChatHistoryRequest,
  GetChatHistoryResponse,
  AccountStatusResponse,
  GetChatsResponse,
  SystemEvent,
  TimelinesAIWebhookPayload,
} from "./types.js";

/** Tipurile publice: `timelinesai/index.ts` face `export *` din `./types.js` (Sonar S7763). */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value.trim();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TimelinesAIClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  readonly webhookSecret: string;

  // Rate limiters per documentation (maxConcurrent=10, minTime preserves rate)
  private readonly sendMessageLimiter: Bottleneck;
  private readonly chatHistoryLimiter: Bottleneck;
  private readonly getChatsLimiter: Bottleneck;

  constructor() {
    this.baseUrl = requireEnv("TIMELINESAI_API_URL");
    this.apiKey = requireEnv("TIMELINESAI_API_KEY");
    this.webhookSecret = requireEnv("TIMELINESAI_WEBHOOK_SECRET");

    // 50/min = 1 request per 1200ms
    this.sendMessageLimiter = new Bottleneck({ maxConcurrent: 10, minTime: 1200 });
    // 100/min = 1 request per 600ms
    this.chatHistoryLimiter = new Bottleneck({ maxConcurrent: 10, minTime: 600 });
    // 20/min = 1 request per 3000ms
    this.getChatsLimiter = new Bottleneck({ maxConcurrent: 5, minTime: 3000 });
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    attempt = 1,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });

    if (response.status === 429) {
      if (attempt <= 5) {
        await sleep(60000);
        return this.request<T>(method, path, body, attempt + 1);
      }
      throw new Error(`TimelinesAI rate limit exceeded after ${attempt} retries`);
    }

    if (response.status >= 500) {
      if (attempt <= 3) {
        const backoff = Math.pow(2, attempt) * 1000;
        await sleep(backoff);
        return this.request<T>(method, path, body, attempt + 1);
      }
      throw new Error(`TimelinesAI server error ${response.status} after ${attempt} retries`);
    }

    if (!response.ok) {
      // 4xx: do not retry
      const errorText = await response.text();
      throw new Error(`TimelinesAI error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Send a WhatsApp message.
   * Rate: 50 req/min per account.
   * Source: etapa2-workers-C-whatsapp.md sec. 2
   */
  sendMessage(req: SendMessageRequest): Promise<SendMessageResponse> {
    return this.sendMessageLimiter.schedule(() =>
      this.request<SendMessageResponse>("POST", "/messages/send", req),
    );
  }

  /**
   * Get chat history for a specific chat.
   * Source: etapa2-workers-C-whatsapp.md sec. 3
   */
  getChatHistory(req: GetChatHistoryRequest): Promise<GetChatHistoryResponse> {
    const { chat_id, limit = 50, offset = 0 } = req;
    return this.chatHistoryLimiter.schedule(() =>
      this.request<GetChatHistoryResponse>(
        "GET",
        `/chats/${chat_id}/messages?limit=${limit}&offset=${offset}`,
      ),
    );
  }

  /**
   * Get account connection status.
   * Source: etapa2-workers-C-whatsapp.md sec. 4
   */
  getAccountStatus(accountId: string): Promise<AccountStatusResponse> {
    return this.chatHistoryLimiter.schedule(() =>
      this.request<AccountStatusResponse>("GET", `/accounts/${accountId}/status`),
    );
  }

  /**
   * Get list of chats for an account.
   * Source: etapa2-workers-C-whatsapp.md sec. 5
   */
  getChats(accountId: string, limit = 100): Promise<GetChatsResponse> {
    return this.getChatsLimiter.schedule(() =>
      this.request<GetChatsResponse>("GET", `/accounts/${accountId}/chats?limit=${limit}`),
    );
  }
}

/**
 * Normalize a TimelinesAI webhook payload to SystemEvent (ADR-0061).
 * eventId format: tai-{message_id}
 */
export function normalizeTimelinesAIEvent(payload: TimelinesAIWebhookPayload): SystemEvent {
  return {
    eventId: `tai-${payload.message_id}`,
    source: "timelinesai",
    eventType: payload.event,
    timestamp: new Date(payload.timestamp * 1000).toISOString(),
    payload: payload as unknown as Record<string, unknown>,
    rawEvent: payload,
  };
}

/** Singleton client — lazy initialization. */
let _client: TimelinesAIClient | undefined;
export function getTimelinesAIClient(): TimelinesAIClient {
  _client ??= new TimelinesAIClient();
  return _client;
}
