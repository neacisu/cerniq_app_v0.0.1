import type { WaProvider, SmsProvider } from "./types.js";
import { createTimelinesAiWaProvider } from "./timelinesai-wa.js";
import { createSmsAdvertSmsProvider } from "./smsadvert-sms.js";
import { createSmsAdvertWithTwilioFallback } from "./sms-primary-fallback.js";
import { createTwilioSmsProvider } from "./twilio-sms.js";

export type WaProviderKind = "timelinesai";

/**
 * Fabrică WA — extensibilă cu `whapi` când există implementare.
 */
export function createWaProvider(kind: WaProviderKind): WaProvider {
  if (kind === "timelinesai") {
    return createTimelinesAiWaProvider();
  }
  throw new Error(`Unknown WA provider: ${String(kind)}`);
}

export type SmsProviderKind = "smsadvert" | "twilio" | "vonage";

/**
 * SMS: SMSAdvert (RO), Twilio, Vonage (neimplementat).
 */
export function createSmsProvider(kind: SmsProviderKind): SmsProvider {
  if (kind === "smsadvert") {
    return createSmsAdvertSmsProvider();
  }
  if (kind === "twilio") {
    return createTwilioSmsProvider();
  }
  throw new Error(
    "Vonage SMS provider is not implemented yet — set SMS_PROVIDER=twilio|smsadvert or extend packages/integrations/src/providers/vonage-sms.ts",
  );
}

function hasSmsAdvertCredentials(): boolean {
  return !!process.env.SMSADVERT_API_TOKEN?.trim();
}

function hasTwilioCredentials(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim());
}

/** Re-export fabrici email pentru workeri (ADR-0059). */
export { createInstantlyColdEmailProvider } from "./instantly-email.js";
export { createResendTransactionalEmailProvider } from "./resend-email.js";

/**
 * Lanț implicit: SMSAdvert.ro dacă există `SMSADVERT_API_TOKEN`, cu fallback Twilio dacă există credențiale Twilio.
 * Suprascriere: `SMS_PROVIDER=twilio` → doar Twilio; `SMS_PROVIDER=smsadvert` → doar SMSAdvert (fără fallback).
 */
export function createSmsProviderFromEnv(): SmsProvider {
  const raw = (process.env.SMS_PROVIDER ?? "").trim().toLowerCase();

  if (raw === "vonage") {
    return createSmsProvider("vonage");
  }

  if (raw === "twilio") {
    return createTwilioSmsProvider();
  }

  if (raw === "smsadvert") {
    return createSmsAdvertSmsProvider();
  }

  if (raw === "smsadvert_twilio" || raw === "default" || raw === "") {
    if (hasSmsAdvertCredentials() && hasTwilioCredentials()) {
      return createSmsAdvertWithTwilioFallback();
    }
    if (hasSmsAdvertCredentials()) {
      return createSmsAdvertSmsProvider();
    }
    if (hasTwilioCredentials()) {
      return createTwilioSmsProvider();
    }
    throw new Error(
      "SMS: setează SMSADVERT_API_TOKEN (rețea principală RO) și/sau TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN (fallback)",
    );
  }

  throw new Error(
    `Unsupported SMS_PROVIDER: ${raw}. Use: (gol)=smsadvert+twilio fallback, smsadvert, twilio, smsadvert_twilio`,
  );
}
