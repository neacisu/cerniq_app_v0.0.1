/**
 * SMS prin rețeaua [smsadvert.ro](https://www.smsadvert.ro/Integrare-API-SMS/ro) — POST JSON.
 * Autentificare: header `Authorization` = token-ul API (fără prefix Bearer).
 * Pentru trimitere prin rețeaua smsadvert: `sendAsShort: true`.
 */
import { callExternalApi } from "@cerniq/worker-shared";
import type { ProviderSendResult, SmsProvider, SmsSendInput } from "./types.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`Environment variable ${name} is required for SMSAdvert SMS`);
  return v.trim();
}

export type SmsAdvertSmsProviderOptions = {
  apiUrl?: string;
  apiToken?: string;
  /** Default true — livrare prin rețeaua smsadvert.ro (nu dispozitive proprii). */
  sendAsShort?: boolean;
};

export class SmsAdvertSmsProvider implements SmsProvider {
  private readonly apiUrl: string;
  private readonly apiToken: string;
  private readonly sendAsShort: boolean;

  constructor(opts?: SmsAdvertSmsProviderOptions) {
    this.apiUrl =
      (opts?.apiUrl ?? process.env.SMSADVERT_API_URL)?.trim() ||
      "https://www.smsadvert.ro/api/sms/";
    this.apiToken = opts?.apiToken ?? requireEnv("SMSADVERT_API_TOKEN");
    const raw = process.env.SMSADVERT_SEND_AS_SHORT;
    this.sendAsShort =
      opts?.sendAsShort ?? (raw === undefined || raw === "" || raw === "true" || raw === "1");
  }

  async sendSms(input: SmsSendInput): Promise<ProviderSendResult> {
    const { toE164, body } = input;
    if (body.length < 3) {
      throw new Error("SMSAdvert: message must be at least 3 characters (API constraint)");
    }
    if (body.length > 480) {
      throw new Error("SMSAdvert: message must be at most 480 characters (API constraint)");
    }

    const payload: Record<string, unknown> = {
      phone: toE164.trim(),
      shortTextMessage: body,
      sendAsShort: this.sendAsShort,
    };

    const res = await callExternalApi("smsadvert-sms", () =>
      fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: this.apiToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      }),
    );

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`SMSAdvert: non-JSON response ${res.status}: ${text.slice(0, 500)}`);
    }

    const obj = json as Record<string, unknown>;

    if (!res.ok) {
      const errMsg =
        (typeof obj.errorMessage === "string" && obj.errorMessage) ||
        (obj.errors && JSON.stringify(obj.errors)) ||
        text.slice(0, 500);
      throw new Error(`SMSAdvert SMS ${res.status}: ${errMsg}`);
    }

    const msgId = typeof obj.msgId === "string" ? obj.msgId : "";
    if (!msgId) {
      throw new Error(`SMSAdvert: missing msgId in success response: ${text.slice(0, 500)}`);
    }

    return {
      messageId: msgId,
      providerUsed: "SMSADVERT",
      raw: obj,
    };
  }
}

export function createSmsAdvertSmsProvider(
  opts?: SmsAdvertSmsProviderOptions,
): SmsAdvertSmsProvider {
  return new SmsAdvertSmsProvider(opts);
}
