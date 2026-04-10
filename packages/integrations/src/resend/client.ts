import Bottleneck from "bottleneck";
import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "@cerniq/worker-shared";

/**
 * Resend API Client — WARM emails ONLY (ADR-0059)
 * Source: etapa2-workers-D-E-email.md sec. 6-8
 *
 * CRITICAL: This client MUST ONLY be used for warm leads.
 * Allowed stages: WARM_REPLY, NEGOTIATION
 * Calling sendEmail for COLD leads will throw LEAD_NOT_WARM.
 *
 * Webhook signature verified via Svix SDK.
 */
import type {
  ResendEmailRequest,
  ResendEmailResponse,
  ResendWebhookPayload,
  ResendSystemEvent,
} from "./types.js";
/** Tipurile sunt re-exportate și din `./types.js` via `resend/index.ts` — fără duplicare `export type` aici (Sonar S7763). */
export { WARM_ALLOWED_STAGES } from "./types.js";
export type { WarmAllowedStage } from "./types.js";

const log = createServiceLogger("resend-client");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value.trim();
}

/** Config opțională; valorile lipsă se citesc din `process.env`. */
export type ResendClientConfig = {
  apiUrl?: string;
  apiKey?: string;
  webhookSecret?: string;
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ResendClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  readonly webhookSecret: string;

  /** ~10 req/s, max 5 concurenți — aliniat la TimelinesAI/Instantly. */
  private readonly sendLimiter: Bottleneck;

  readonly fromEmail: string = "sales@cerniq.app";
  readonly fromName: string = "Cerniq Sales";
  readonly replyTo: string = "reply@cerniq.app";

  constructor(config?: ResendClientConfig) {
    this.baseUrl = config?.apiUrl?.trim() ?? requireEnv("RESEND_API_URL");
    this.apiKey = config?.apiKey?.trim() ?? requireEnv("RESEND_API_KEY");
    this.webhookSecret = config?.webhookSecret?.trim() ?? requireEnv("RESEND_WEBHOOK_SECRET");
    this.sendLimiter = new Bottleneck({ maxConcurrent: 5, minTime: 100 });
  }

  private async fetchOnce(method: "GET" | "POST", path: string, body?: unknown): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    return callExternalApi("resend", () =>
      fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(8000),
      }),
    );
  }

  private resendSuccessLogPayload(
    path: string,
    method: string,
    statusCode: number,
    attempt: number,
    latencyMs: number,
    data: unknown,
  ): Record<string, unknown> {
    const successPayload: Record<string, unknown> = {
      event: "resend_request_success",
      method,
      path,
      statusCode,
      attempts: attempt,
      latencyMs,
    };
    const dataObj = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    if (path === "/emails" && dataObj && typeof dataObj.id === "string") {
      successPayload.emailId = dataObj.id;
    }
    return successPayload;
  }

  private async shouldRetry429Resend(
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
      event: "resend_request_failed",
      reason: "rate_limit_exhausted",
      method,
      path,
      attempts: attempt,
      latencyMs: latencyMs(),
    });
    throw new Error(`Resend rate limit exceeded after ${attempt} retries`, {
      cause: new Error("HTTP 429"),
    });
  }

  private async shouldRetry5xxResend(
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
      event: "resend_request_failed",
      reason: "server_error_exhausted",
      httpStatus: response.status,
      method,
      path,
      attempts: attempt,
      latencyMs: latencyMs(),
    });
    throw new Error(`Resend server error ${response.status}`, {
      cause: new Error(`HTTP ${response.status}`),
    });
  }

  private async throwResendClientErrorIfNeeded(
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
      event: "resend_request_failed",
      reason: "client_error",
      httpStatus: response.status,
      method,
      path,
      latencyMs: latencyMs(),
    });
    throw new Error(`Resend error ${response.status}: ${errorText}`, {
      cause: new Error(errorText),
    });
  }

  private async parseResendJsonBody<T>(
    response: Response,
    method: string,
    path: string,
    attempt: number,
    latencyMs: () => number,
  ): Promise<T> {
    try {
      const data = (await response.json()) as T;
      log.info(
        this.resendSuccessLogPayload(path, method, response.status, attempt, latencyMs(), data),
      );
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({
        event: "resend_request_error",
        phase: "json_parse",
        method,
        path,
        latencyMs: latencyMs(),
        err,
      });
      throw new Error(`Resend invalid JSON: ${msg}`, { cause: err });
    }
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const t0 = performance.now();
    const latencyMs = () => Math.round(performance.now() - t0);
    let attempt = 0;

    log.info({ event: "resend_request_start", method, path });

    for (;;) {
      attempt += 1;
      let response: Response;
      try {
        response = await this.fetchOnce(method, path, body);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error({
          event: "resend_request_error",
          phase: "fetch",
          method,
          path,
          attempt,
          latencyMs: latencyMs(),
          err,
        });
        throw new Error(`Resend network error: ${msg}`, { cause: err });
      }

      if (await this.shouldRetry429Resend(response, attempt, method, path, latencyMs)) {
        continue;
      }
      if (await this.shouldRetry5xxResend(response, attempt, method, path, latencyMs)) {
        continue;
      }

      await this.throwResendClientErrorIfNeeded(response, method, path, latencyMs);
      return this.parseResendJsonBody<T>(response, method, path, attempt, latencyMs);
    }
  }

  /**
   * Send a warm email via Resend.
   * ADR-0059: currentState MUST be WARM_REPLY or NEGOTIATION.
   * The caller is responsible for validating the lead stage BEFORE calling.
   * Guard is documented here for clarity — enforce in worker layer.
   *
   * Tags are added automatically for webhook correlation:
   *   [{name: "lead_id", value: ...}, {name: "tenant_id", value: ...}]
   */
  async sendEmail(req: ResendEmailRequest): Promise<ResendEmailResponse> {
    const payload = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: req.to,
      subject: req.subject,
      html: req.html,
      ...(req.text && { text: req.text }),
      reply_to: this.replyTo,
      tags: req.tags ?? [],
      ...(req.attachments?.length && { attachments: req.attachments }),
    };
    return this.sendLimiter.schedule(() =>
      this.request<ResendEmailResponse>("POST", "/emails", payload),
    );
  }
}

/**
 * Verify Svix webhook signature.
 * Uses Svix SDK for cryptographic verification.
 * Source: etapa2-workers-D-E-email.md sec. 8
 *
 * Returns the parsed payload if valid, throws if invalid.
 */
export async function verifyResendWebhook(
  rawBody: string | Buffer,
  headers: Record<string, string>,
  webhookSecret: string,
): Promise<ResendWebhookPayload> {
  const { Webhook } = await import("svix");
  const wh = new Webhook(webhookSecret);
  return wh.verify(rawBody as string, headers) as ResendWebhookPayload;
}

/**
 * Normalize a Resend webhook payload to SystemEvent (ADR-0061).
 * eventId format: resend-{email_id}
 */
export function normalizeResendEvent(payload: ResendWebhookPayload): ResendSystemEvent {
  return {
    eventId: `resend-${payload.data.email_id}`,
    source: "resend",
    eventType: payload.type,
    timestamp: payload.data.created_at ?? new Date().toISOString(),
    payload: payload as unknown as Record<string, unknown>,
    rawEvent: payload,
  };
}

/** Singleton client — lazy initialization. */
let _client: ResendClient | undefined;
export function getResendClient(config?: ResendClientConfig): ResendClient {
  if (config) {
    return new ResendClient(config);
  }
  _client ??= new ResendClient();
  return _client;
}
