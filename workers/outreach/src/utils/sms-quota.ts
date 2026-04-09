/**
 * Cotă zilnică SMS per tenant (Redis) — aliniat la `quota:guardian:*` (chei separate).
 */
import type { Redis } from "ioredis";
import { DateTime } from "luxon";

/** Lua atomic: rezervă segmente; depășire limită → rollback și cod -1. */
const SMS_QUOTA_RESERVE_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local seg = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local cur = tonumber(redis.call('GET', key) or '0')
if cur + seg > limit then
  return -1
end
local newv = redis.call('INCRBY', key, seg)
if newv == seg then
  redis.call('EXPIRE', key, ttl)
end
return newv
`;

const SMS_QUOTA_RELEASE_LUA = `
local key = KEYS[1]
local seg = tonumber(ARGV[1])
return redis.call('INCRBY', key, -seg)
`;

export function getBucharestDateIsoForSms(now = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

export function smsQuotaKey(tenantId: string, dateIso: string): string {
  return `sms:quota:${tenantId}:${dateIso}`;
}

export function ttlSecondsToEndOfBucharestDay(now = new Date()): number {
  const dt = DateTime.fromJSDate(now).setZone("Europe/Bucharest");
  const end = dt.endOf("day");
  const sec = Math.ceil(end.diff(dt, "seconds").seconds);
  return Math.max(120, sec + 3600);
}

export async function reserveSmsSegments(
  redis: Redis,
  tenantId: string,
  dateIso: string,
  segments: number,
  dailyLimit: number,
): Promise<{ ok: true; total: number } | { ok: false }> {
  const key = smsQuotaKey(tenantId, dateIso);
  const ttl = ttlSecondsToEndOfBucharestDay();
  const raw = await redis.eval(
    SMS_QUOTA_RESERVE_LUA,
    1,
    key,
    String(dailyLimit),
    String(segments),
    String(ttl),
  );
  const n = Number(raw);
  if (n < 0) return { ok: false };
  return { ok: true, total: n };
}

export async function releaseSmsSegments(
  redis: Redis,
  tenantId: string,
  dateIso: string,
  segments: number,
): Promise<void> {
  const key = smsQuotaKey(tenantId, dateIso);
  await redis.eval(SMS_QUOTA_RELEASE_LUA, 1, key, String(segments));
}

export async function getSmsQuotaUsage(
  redis: Redis,
  tenantId: string,
  dateIso: string,
): Promise<number> {
  const key = smsQuotaKey(tenantId, dateIso);
  const v = await redis.get(key);
  return Number(v ?? 0);
}
