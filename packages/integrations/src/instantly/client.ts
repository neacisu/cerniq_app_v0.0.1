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

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      const response = await this.fetchOnce(method, path, body);

      if (response.status === 429) {
        if (attempt <= 5) {
          await sleep(60000);
          continue;
        }
        throw new Error(`Instantly rate limit exceeded after ${attempt} retries`);
      }

      if (response.status >= 500) {
        if (attempt <= 3) {
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw new Error(`Instantly server error ${response.status} after ${attempt} retries`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Instantly error ${response.status}: ${errorText}`);
      }

      return response.json() as Promise<T>;
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
