/**
 * SMS prin Twilio REST API — credențiale din env (OpenBao → workers.env / api.env).
 * @see https://www.twilio.com/docs/sms/api/message-resource#create-a-message-resource
 */
import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "@cerniq/worker-shared";
import type { ProviderSendResult, SmsProvider, SmsSendInput } from "./types.js";

const log = createServiceLogger("twilio-sms");

function e164Last4(e164: string): string {
  const d = e164.replaceAll(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : "****";
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`Environment variable ${name} is required for Twilio SMS`);
  return v.trim();
}

export class TwilioSmsProvider implements SmsProvider {
  private readonly accountSid: string;
  private readonly authToken: string;

  constructor(opts?: { accountSid?: string; authToken?: string }) {
    this.accountSid = opts?.accountSid ?? requireEnv("TWILIO_ACCOUNT_SID");
    this.authToken = opts?.authToken ?? requireEnv("TWILIO_AUTH_TOKEN");
  }

  async sendSms(input: SmsSendInput): Promise<ProviderSendResult> {
    const t0 = performance.now();
    const phoneLast4 = e164Last4(input.toE164);
    log.info({ event: "twilio_sms_start", phoneLast4 });
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const basic = Buffer.from(`${this.accountSid}:${this.authToken}`, "utf8").toString("base64");
    const body = new URLSearchParams();
    body.set("To", input.toE164);
    body.set("From", input.from);
    body.set("Body", input.body);

    let failureLogged = false;
    try {
      const res = await callExternalApi("twilio-sms", () =>
        fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
          signal: AbortSignal.timeout(15_000),
        }),
      );

      if (!res.ok) {
        const t = await res.text();
        const err = new Error(`Twilio SMS ${res.status}: ${t}`);
        failureLogged = true;
        log.error({
          event: "twilio_sms_http_error",
          phoneLast4,
          statusCode: res.status,
          latencyMs: Math.round(performance.now() - t0),
          err,
        });
        throw err;
      }

      let json: { sid?: string };
      try {
        json = (await res.json()) as { sid?: string };
      } catch (parseErr) {
        const err = new Error("Twilio SMS: invalid JSON body", { cause: parseErr });
        failureLogged = true;
        log.error({
          event: "twilio_sms_json_failed",
          phoneLast4,
          latencyMs: Math.round(performance.now() - t0),
          err,
        });
        throw err;
      }
      log.info({
        event: "twilio_sms_success",
        phoneLast4,
        latencyMs: Math.round(performance.now() - t0),
        messageIdPrefix: json.sid ? String(json.sid).slice(0, 8) : undefined,
      });
      return { messageId: json.sid ?? "", raw: json, providerUsed: "TWILIO" };
    } catch (err) {
      if (!failureLogged) {
        log.error({
          event: "twilio_sms_failed",
          phoneLast4,
          latencyMs: Math.round(performance.now() - t0),
          err,
        });
      }
      throw err;
    }
  }
}

export function createTwilioSmsProvider(config?: {
  accountSid?: string;
  authToken?: string;
}): TwilioSmsProvider {
  return new TwilioSmsProvider(config);
}
