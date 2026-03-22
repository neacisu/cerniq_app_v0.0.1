/**
 * Quota Guardian — Redis Lua Script
 * Source: etapa2-workers-A-quota-guardian.md sec. 2.4
 *
 * KEYS[1]: quota:wa:{phone_id}:{date_iso}
 * KEYS[2]: phone:status:{phone_id}
 * ARGV[1]: daily_limit (200)
 * ARGV[2]: cost (1 = new contact, 0 = follow-up)
 * ARGV[3]: current_hour (for business hours check: 09-18)
 *
 * Returns JSON: {allowed, reason, current_usage, remaining, cost_applied}
 *
 * CRITICAL: cost=0 ALWAYS allowed (follow-ups unlimited).
 * CRITICAL: TTL = 172800s (48h) per documentation.
 */
export const QUOTA_CHECK_LUA = `
local quota_key = KEYS[1]
local status_key = KEYS[2]
local limit = tonumber(ARGV[1])
local cost = tonumber(ARGV[2])
local current_hour = tonumber(ARGV[3])

-- Check 1: Phone status
local phone_status = redis.call("GET", status_key)
if phone_status and phone_status ~= "ACTIVE" then
    return cjson.encode({
        allowed = false,
        reason = "PHONE_OFFLINE",
        current_usage = 0,
        remaining = 0
    })
end

-- Check 2: Business hours (09:00 - 18:00 Bucharest)
if current_hour < 9 or current_hour >= 18 then
    return cjson.encode({
        allowed = false,
        reason = "OUTSIDE_BUSINESS_HOURS",
        current_usage = tonumber(redis.call("GET", quota_key) or "0"),
        remaining = limit - tonumber(redis.call("GET", quota_key) or "0")
    })
end

-- Check 3: Follow-up ALWAYS allowed (cost = 0)
if cost == 0 then
    return cjson.encode({
        allowed = true,
        reason = "QUOTA_OK",
        current_usage = tonumber(redis.call("GET", quota_key) or "0"),
        remaining = limit - tonumber(redis.call("GET", quota_key) or "0"),
        cost_applied = 0
    })
end

-- Check 4: NEW contact quota
local current_usage = tonumber(redis.call("GET", quota_key) or "0")

if current_usage + cost > limit then
    return cjson.encode({
        allowed = false,
        reason = "QUOTA_EXCEEDED",
        current_usage = current_usage,
        remaining = 0
    })
end

-- Increment and set TTL 48h
redis.call("INCRBY", quota_key, cost)
redis.call("EXPIRE", quota_key, 172800)

return cjson.encode({
    allowed = true,
    reason = "QUOTA_OK",
    current_usage = current_usage + cost,
    remaining = limit - (current_usage + cost),
    cost_applied = cost
})
`;

/** Get the Redis key for a phone's quota on a given date */
export function getQuotaKey(phoneId: string, dateIso: string): string {
  return `quota:wa:${phoneId}:${dateIso}`;
}

/** Get the Redis key for a phone's status */
export function getPhoneStatusKey(phoneId: string): string {
  return `phone:status:${phoneId}`;
}

/** Daily quota limit per documentation */
export const DAILY_QUOTA_LIMIT = 200;

/** Quota key TTL = 48h in seconds */
export const QUOTA_KEY_TTL_SECONDS = 172800;
