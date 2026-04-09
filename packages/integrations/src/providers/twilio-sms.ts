/**
 * SMS prin Twilio REST API — credențiale din env (OpenBao → workers.env / api.env).
 * @see https://www.twilio.com/docs/sms/api/message-resource#create-a-message-resource
 */
import { callExternalApi } from "@cerniq/worker-shared";
import type { ProviderSendResult, SmsProvider, SmsSendInput } from "./types.js";

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
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const basic = Buffer.from(`${this.accountSid}:${this.authToken}`, "utf8").toString("base64");
    const body = new URLSearchParams();
    body.set("To", input.toE164);
    body.set("From", input.from);
    body.set("Body", input.body);

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
      throw new Error(`Twilio SMS ${res.status}: ${t}`);
    }

    const json = (await res.json()) as { sid?: string };
    return { messageId: json.sid ?? "", raw: json, providerUsed: "TWILIO" };
  }
}

export function createTwilioSmsProvider(config?: {
  accountSid?: string;
  authToken?: string;
}): TwilioSmsProvider {
  return new TwilioSmsProvider(config);
}
