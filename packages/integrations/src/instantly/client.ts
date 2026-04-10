/**
 * Instantly.ai API Client
 * Source: etapa2-workers-D-E-email.md sec. 1.3, 2-4
 *
 * Rate limits per documentation:
 *   addLead: 1000/hour
 *   getAnalytics: 100/min
 *
 * Circuit breaker: bounce rate > 3% triggers campaign pause (ADR-0066)
 *
 * Retry strategy (etapa2-workers-overview.md sec. 6):
 *   429: 5 retries, fixed 60s
 *   5xx: 3 retries, exponential (2s, 4s, 8s)
 *   4xx: 0 retries, throw immediately
 */
import Bottleneck from "bottleneck";
import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "@cerniq/worker-shared";
import type {
  AddLeadRequest,
  AddLeadResponse,
  CampaignAnalytics,
  CreateCampaignRequest,
  CreateCampaignResponse,
  GetCampaignsResponse,
  InstantlyWebhookPayload,
  InstantlySystemEvent,
} from "./types.js";

// Tipurile sunt re-exportate din `./types.js` prin `index.ts` — evităm duplicarea (Sonar S7763).

// Bounce threshold from ADR-0066 (MUST NOT change)
export const BOUNCE_THRESHOLD = 0.03;

const log = createServiceLogger("instantly-client");

const INSTANTLY_CAMPAIGN_PATH_RE = /^\/campaign\/([^/]+)\/(analytics|pause)$/;

function readCampaignIdFromCreateResponse(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const id = (data as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value.trim();
}

/** Config opțională; valorile lipsă se citesc din `process.env`. */
export type InstantlyClientConfig = {
  apiUrl?: string;
  apiKey?: string;
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class InstantlyClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  // 1000/h = 1 per 3600ms (addLead)
  private readonly addLeadLimiter: Bottleneck;
  // 100/min = 1 per 600ms (analytics)
  private readonly analyticsLimiter: Bottleneck;

  constructor(config?: InstantlyClientConfig) {
    this.baseUrl = config?.apiUrl?.trim() ?? requireEnv("INSTANTLY_API_URL");
    this.apiKey = config?.apiKey?.trim() ?? requireEnv("INSTANTLY_API_KEY");

    this.addLeadLimiter = new Bottleneck({ maxConcurrent: 10, minTime: 3600 });
    this.analyticsLimiter = new Bottleneck({ maxConcurrent: 5, minTime: 600 });
  }

  private async fetchOnce(method: "GET" | "POST", path: string, body?: unknown): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
    return callExternalApi("instantly", () =>
      fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
      }),
    );
  }

  /** campaignId din path (`/campaign/:id/...`) sau din body (`campaign_id` la addLead). */
  private instantlyCampaignContext(path: string, body?: unknown): { campaignId?: string } {
    const fromPath = INSTANTLY_CAMPAIGN_PATH_RE.exec(path);
    if (fromPath?.[1]) return { campaignId: fromPath[1] };
    if (body && typeof body === "object" && body !== null) {
      const cid = (body as Record<string, unknown>).campaign_id;
      if (typeof cid === "string") return { campaignId: cid };
    }
    return {};
  }

  private instantlySuccessExtras(
    path: string,
    method: string,
    body: unknown,
    data: unknown,
  ): { campaignId?: string } {
    const fromCtx = this.instantlyCampaignContext(path, body);
    if (fromCtx.campaignId) return fromCtx;
    const createdId = readCampaignIdFromCreateResponse(data);
    if (path === "/campaign" && method === "POST" && createdId) {
      return { campaignId: createdId };
    }
    return {};
  }

  private async shouldRetry429Instantly(
    response: Response,
    attempt: number,
    method: string,
    path: string,
    latencyMs: () => number,
    body?: unknown,
  ): Promise<boolean> {
    if (response.status !== 429) return false;
    if (attempt <= 5) {
      await sleep(60000);
      return true;
    }
    log.error({
      event: "instantly_request_failed",
      reason: "rate_limit_exhausted",
      method,
      path,
      attempts: attempt,
      latencyMs: latencyMs(),
      ...this.instantlyCampaignContext(path, body),
    });
    throw new Error(`Instantly rate limit exceeded after ${attempt} retries`, {
      cause: new Error("HTTP 429"),
    });
  }

  private async shouldRetry5xxInstantly(
    response: Response,
    attempt: number,
    method: string,
    path: string,
    latencyMs: () => number,
    body?: unknown,
  ): Promise<boolean> {
    if (response.status < 500) return false;
    if (attempt <= 3) {
      await sleep(Math.pow(2, attempt) * 1000);
      return true;
    }
    log.error({
      event: "instantly_request_failed",
      reason: "server_error_exhausted",
      httpStatus: response.status,
      method,
      path,
      attempts: attempt,
      latencyMs: latencyMs(),
      ...this.instantlyCampaignContext(path, body),
    });
    throw new Error(`Instantly server error ${response.status} after ${attempt} retries`, {
      cause: new Error(`HTTP ${response.status}`),
    });
  }

  private async throwInstantlyClientErrorIfNeeded(
    response: Response,
    method: string,
    path: string,
    latencyMs: () => number,
    body?: unknown,
  ): Promise<void> {
    if (response.ok) return;
    let errorText: string;
    try {
      errorText = await response.text();
    } catch (readErr) {
      errorText = `read_error:${readErr instanceof Error ? readErr.message : String(readErr)}`;
    }
    log.error({
      event: "instantly_request_failed",
      reason: "client_error",
      httpStatus: response.status,
      method,
      path,
      latencyMs: latencyMs(),
      ...this.instantlyCampaignContext(path, body),
    });
    throw new Error(`Instantly error ${response.status}: ${errorText}`, {
      cause: new Error(errorText),
    });
  }

  private async parseInstantlyJsonBody<T>(
    response: Response,
    method: string,
    path: string,
    body: unknown,
    attempt: number,
    latencyMs: () => number,
  ): Promise<T> {
    try {
      const data = (await response.json()) as T;
      log.info({
        event: "instantly_request_success",
        method,
        path,
        statusCode: response.status,
        attempts: attempt,
        latencyMs: latencyMs(),
        ...this.instantlySuccessExtras(path, method, body, data),
      });
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({
        event: "instantly_request_error",
        phase: "json_parse",
        method,
        path,
        latencyMs: latencyMs(),
        ...this.instantlyCampaignContext(path, body),
        err,
      });
      throw new Error(`Instantly invalid JSON: ${msg}`, { cause: err });
    }
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const t0 = performance.now();
    const latencyMs = () => Math.round(performance.now() - t0);
    let attempt = 0;

    log.info({
      event: "instantly_request_start",
      method,
      path,
      ...this.instantlyCampaignContext(path, body),
    });

    for (;;) {
      attempt += 1;
      let response: Response;
      try {
        response = await this.fetchOnce(method, path, body);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error({
          event: "instantly_request_error",
          phase: "fetch",
          method,
          path,
          attempt,
          latencyMs: latencyMs(),
          ...this.instantlyCampaignContext(path, body),
          err,
        });
        throw new Error(`Instantly network error: ${msg}`, { cause: err });
      }

      if (await this.shouldRetry429Instantly(response, attempt, method, path, latencyMs, body)) {
        continue;
      }
      if (await this.shouldRetry5xxInstantly(response, attempt, method, path, latencyMs, body)) {
        continue;
      }

      await this.throwInstantlyClientErrorIfNeeded(response, method, path, latencyMs, body);
      return this.parseInstantlyJsonBody<T>(response, method, path, body, attempt, latencyMs);
    }
  }

  /**
   * Add a lead to an Instantly campaign.
   * Instantly manages the actual sending (not sendEmail directly).
   * Rate: 1000/hour.
   * Source: etapa2-workers-D-E-email.md sec. 2
   */
  addLead(req: AddLeadRequest): Promise<AddLeadResponse> {
    return this.addLeadLimiter.schedule(() =>
      this.request<AddLeadResponse>("POST", "/lead/add", req),
    );
  }

  /**
   * Get all campaigns with analytics.
   * Source: etapa2-workers-D-E-email.md sec. 5
   */
  getCampaigns(): Promise<GetCampaignsResponse> {
    return this.analyticsLimiter.schedule(() =>
      this.request<GetCampaignsResponse>("GET", "/campaign/list"),
    );
  }

  /**
   * Metrici detaliate per campanie.
   * Source: etapa2-workers-D-E-email.md — GET /campaign/{id}/analytics
   */
  getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    return this.analyticsLimiter.schedule(() =>
      this.request<CampaignAnalytics>("GET", `/campaign/${campaignId}/analytics`),
    );
  }

  /** Creare campanie rece (trimis din worker `email:cold:campaign:create`). */
  createCampaign(body: CreateCampaignRequest): Promise<CreateCampaignResponse> {
    return this.analyticsLimiter.schedule(() =>
      this.request<CreateCampaignResponse>("POST", "/campaign", body),
    );
  }

  /**
   * Pause a campaign (used by circuit breaker on high bounce rate).
   * ADR-0066: bounce > 3% triggers pause.
   */
  pauseCampaign(campaignId: string): Promise<void> {
    return this.analyticsLimiter.schedule(() =>
      this.request<void>("POST", `/campaign/${campaignId}/pause`, {}),
    );
  }
}

/**
 * Normalize an Instantly webhook payload to SystemEvent (ADR-0061).
 * eventId format: ins-{timestamp}-{lead_email_hash}
 */
export function normalizeInstantlyEvent(payload: InstantlyWebhookPayload): InstantlySystemEvent {
  const ts = payload.timestamp || new Date().toISOString();
  return {
    eventId: `ins-${new Date(ts).getTime()}`,
    source: "instantly",
    eventType: payload.event,
    timestamp: ts,
    payload: payload as unknown as Record<string, unknown>,
    rawEvent: payload,
  };
}

/** Singleton client — lazy initialization. */
let _client: InstantlyClient | undefined;
export function getInstantlyClient(config?: InstantlyClientConfig): InstantlyClient {
  if (config) {
    return new InstantlyClient(config);
  }
  _client ??= new InstantlyClient();
  return _client;
}
