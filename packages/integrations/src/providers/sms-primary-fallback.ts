/**
 * Lanț SMS: încearcă SMSAdvert.ro, apoi Twilio la eșec (rețea / 5xx / erori API).
 */
import type { ProviderSendResult, SmsProvider, SmsSendInput } from "./types.js";
import { createSmsAdvertSmsProvider } from "./smsadvert-sms.js";
import { createTwilioSmsProvider } from "./twilio-sms.js";

export type SmsAdvertTwilioFallbackOptions = {
  smsAdvert?: ReturnType<typeof createSmsAdvertSmsProvider>;
  twilio?: () => ReturnType<typeof createTwilioSmsProvider>;
};

/**
 * `primary` eșuează → `fallback`; Twilio se instanțiază doar la nevoie (lazy), ca deploy-uri doar-SMSAdvert să nu ceară TWILIO_*.
 */
export function createSmsAdvertWithTwilioFallback(
  opts?: SmsAdvertTwilioFallbackOptions,
): SmsProvider {
  const primary = opts?.smsAdvert ?? createSmsAdvertSmsProvider();
  const getFallback = opts?.twilio ?? (() => createTwilioSmsProvider());

  return {
    async sendSms(input: SmsSendInput): Promise<ProviderSendResult> {
      try {
        const r = await primary.sendSms(input);
        return {
          ...r,
          providerUsed: "SMSADVERT",
        };
      } catch (primaryErr) {
        const fallback = getFallback();
        const r = await fallback.sendSms(input);
        const baseRaw =
          r.raw !== undefined && r.raw !== null && typeof r.raw === "object"
            ? (r.raw as Record<string, unknown>)
            : {};
        return {
          ...r,
          providerUsed: "TWILIO",
          raw: {
            ...baseRaw,
            smsadvertPrimaryError:
              primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
          },
        };
      }
    },
  };
}
