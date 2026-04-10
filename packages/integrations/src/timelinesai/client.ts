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
import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "@cerniq/worker-shared";
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

const log = createServiceLogger("timelinesai-client");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value.trim();
}

/** Config opțională; valorile lipsă se citesc din `process.env`. */
export type TimelinesAIClientConfig = {
  apiUrl?: string;
  apiKey?: string;
  webhookSecret?: string;
};

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

  constructor(config?: TimelinesAIClientConfig) {
    this.baseUrl = config?.apiUrl?.trim() ?? requireEnv("TIMELINESAI_API_URL");
    this.apiKey = config?.apiKey?.trim() ?? requireEnv("TIMELINESAI_API_KEY");
    this.webhookSecret = config?.webhookSecret?.trim() ?? requireEnv("TIMELINESAI_WEBHOOK_SECRET");

    // 50/min = 1 request per 1200ms
    this.sendMessageLimiter = new Bottleneck({ maxConcurrent: 10, minTime: 1200 });
    // 100/min = 1 request per 600ms
    this.chatHistoryLimiter = new Bottleneck({ maxConcurrent: 10, minTime: 600 });
    // 20/min = 1 request per 3000ms
    this.getChatsLimiter = new Bottleneck({ maxConcurrent: 5, minTime: 3000 });
  }

  /** Circuit breaker + metrici pe fiecare încercare HTTP; sleep/backoff rămân în afara Opossum. */
  private async fetchOnce(method: "GET" | "POST", path: string, body?: unknown): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
    return callExternalApi("timelinesai", () =>
      fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
      }),
    );
  }

  private async shouldRetry429Timelines(
    response: Response,
    attempt: number,
    method: string,
    path: string,
    latencyMs: () => number,
  ): Promise<boolean> {
    if (response.status !== 429) return false;
    if (attempt <= 5) {
      await sleep(60000);
      return true;
    }
    log.error({
      event: "timelinesai_request_failed",
      reason: "rate_limit_exhausted",
      method,
      path,
      attempts: attempt,
      latencyMs: latencyMs(),
    });
    throw new Error(`TimelinesAI rate limit exceeded after ${attempt} retries`, {
      cause: new Error("HTTP 429"),
    });
  }

  private async shouldRetry5xxTimelines(
    response: Response,
    attempt: number,
    method: string,
    path: string,
    latencyMs: () => number,
  ): Promise<boolean> {
    if (response.status < 500) return false;
    if (attempt <= 3) {
      await sleep(Math.pow(2, attempt) * 1000);
      return true;
    }
    log.error({
      event: "timelinesai_request_failed",
      reason: "server_error_exhausted",
      httpStatus: response.status,
      method,
      path,
      attempts: attempt,
      latencyMs: latencyMs(),
    });
    throw new Error(`TimelinesAI server error ${response.status} after ${attempt} retries`, {
      cause: new Error(`HTTP ${response.status}`),
    });
  }

  private async throwTimelinesClientErrorIfNeeded(
    response: Response,
    method: string,
    path: string,
    latencyMs: () => number,
  ): Promise<void> {
    if (response.ok) return;
    let errorText: string;
    try {
      errorText = await response.text();
    } catch (readErr) {
      errorText = `read_error:${readErr instanceof Error ? readErr.message : String(readErr)}`;
    }
    log.error({
      event: "timelinesai_request_failed",
      reason: "client_error",
      httpStatus: response.status,
      method,
      path,
      latencyMs: latencyMs(),
    });
    throw new Error(`TimelinesAI error ${response.status}: ${errorText}`, {
      cause: new Error(errorText),
    });
  }

  private async parseTimelinesJsonBody<T>(
    response: Response,
    method: string,
    path: string,
    attempt: number,
    latencyMs: () => number,
  ): Promise<T> {
    try {
      const data = (await response.json()) as T;
      log.info({
        event: "timelinesai_request_success",
        method,
        path,
        statusCode: response.status,
        attempts: attempt,
        latencyMs: latencyMs(),
      });
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({
        event: "timelinesai_request_error",
        phase: "json_parse",
        method,
        path,
        latencyMs: latencyMs(),
        err,
      });
      throw new Error(`TimelinesAI invalid JSON: ${msg}`, { cause: err });
    }
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const t0 = performance.now();
    const latencyMs = () => Math.round(performance.now() - t0);
    let attempt = 0;

    log.info({ event: "timelinesai_request_start", method, path });

    for (;;) {
      attempt += 1;
      let response: Response;
      try {
        response = await this.fetchOnce(method, path, body);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error({
          event: "timelinesai_request_error",
          phase: "fetch",
          method,
          path,
          attempt,
          latencyMs: latencyMs(),
          err,
        });
        throw new Error(`TimelinesAI network error: ${msg}`, { cause: err });
      }

      if (await this.shouldRetry429Timelines(response, attempt, method, path, latencyMs)) {
        continue;
      }
      if (await this.shouldRetry5xxTimelines(response, attempt, method, path, latencyMs)) {
        continue;
      }

      await this.throwTimelinesClientErrorIfNeeded(response, method, path, latencyMs);
      return this.parseTimelinesJsonBody<T>(response, method, path, attempt, latencyMs);
    }
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

/** Singleton client — lazy initialization (fără config în apeluri repetate). */
let _client: TimelinesAIClient | undefined;
export function getTimelinesAIClient(config?: TimelinesAIClientConfig): TimelinesAIClient {
  if (config) {
    return new TimelinesAIClient(config);
  }
  _client ??= new TimelinesAIClient();
  return _client;
}
