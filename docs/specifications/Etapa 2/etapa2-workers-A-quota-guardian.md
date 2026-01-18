# CERNIQ.APP — ETAPA 2: WORKERS CATEGORIA A
## Quota Guardian & Rate Limiting (4 Workers)
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. OVERVIEW

Quota Guardian este sistemul critic care protejează numerele WhatsApp de ban prin enforcing limita de 200 contacte NOI pe zi per număr.

## 1.1 Worker Inventory

| # | Queue Name | Purpose | Concurrency |
|---|------------|---------|-------------|
| 1 | `quota:guardian:check` | Verificare atomică cotă | 100 |
| 2 | `quota:guardian:increment` | Incrementare după succes | 100 |
| 3 | `quota:guardian:reset` | Reset zilnic la 00:00 | 1 |
| 4 | `quota:business-hours:check` | Verificare ore lucru | 100 |

## 1.2 Key Concepts

- **NEW Contact**: Cost = 1 (consumă din cota de 200)
- **FOLLOW-UP**: Cost = 0 (nelimitat)
- **Business Hours**: 09:00-18:00 local time
- **Atomic Operations**: Redis Lua scripts

---

# 2. WORKER #1: quota:guardian:check

## 2.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `quota:guardian:check` |
| **Concurrency** | 100 |
| **Timeout** | 2000ms |
| **Rate Limit** | None (internal service) |
| **Retry** | 0 (no retry - synchronous check) |

## 2.2 Job Input Schema

```typescript
interface QuotaCheckJobData {
  correlationId: string;
  tenantId: string;
  phoneId: string;
  leadId: string;
  isNewContact: boolean;
  targetTimezone: string;  // e.g., 'Europe/Bucharest'
}
```

## 2.3 Job Output Schema

```typescript
interface QuotaCheckResult {
  allowed: boolean;
  reason: 'QUOTA_OK' | 'QUOTA_EXCEEDED' | 'OUTSIDE_BUSINESS_HOURS' | 'PHONE_OFFLINE' | 'PHONE_BANNED';
  quotaDetails: {
    phoneId: string;
    currentUsage: number;
    dailyLimit: number;
    remainingQuota: number;
    quotaResetAt: string;
  };
  businessHours: {
    isWithinHours: boolean;
    currentLocalTime: string;
    allowedStart: string;
    allowedEnd: string;
  };
  recommendation: {
    action: 'PROCEED' | 'DELAY' | 'REJECT';
    delayUntil?: string;
    alternativePhoneId?: string;
  };
}
```

## 2.4 Redis Lua Script (Atomic Check)

```lua
-- quota_check.lua
-- KEYS[1]: quota:wa:{phone_id}:{date_iso}
-- KEYS[2]: phone:status:{phone_id}
-- ARGV[1]: daily_limit (200)
-- ARGV[2]: cost (1 for NEW, 0 for FOLLOW_UP)
-- ARGV[3]: current_hour (for business hours check)

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

-- Check 2: Business hours (09:00 - 18:00)
if current_hour < 9 or current_hour >= 18 then
    return cjson.encode({
        allowed = false,
        reason = "OUTSIDE_BUSINESS_HOURS",
        current_usage = tonumber(redis.call("GET", quota_key) or "0"),
        remaining = limit - tonumber(redis.call("GET", quota_key) or "0")
    })
end

-- Check 3: Follow-up always allowed (cost = 0)
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

-- Increment and set TTL (48h for safety)
redis.call("INCRBY", quota_key, cost)
redis.call("EXPIRE", quota_key, 172800)

return cjson.encode({
    allowed = true,
    reason = "QUOTA_OK",
    current_usage = current_usage + cost,
    remaining = limit - (current_usage + cost),
    cost_applied = cost
})
```

## 2.5 Worker Implementation

```typescript
// workers/quota/guardian-check.worker.ts

import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { DateTime } from 'luxon';
import { logger } from '@cerniq/logger';
import { db } from '@cerniq/db';
import { waPhoneNumbers } from '@cerniq/db/schema';
import { eq, and, lt } from 'drizzle-orm';

const redis = new Redis(process.env.REDIS_URL!);

// Load Lua script at startup
const quotaCheckScript = fs.readFileSync('./lua/quota_check.lua', 'utf-8');
let quotaCheckSha: string;

export async function initQuotaGuardian() {
  quotaCheckSha = await redis.script('LOAD', quotaCheckScript);
  logger.info({ sha: quotaCheckSha }, 'Quota check script loaded');
}

export async function quotaGuardianCheckProcessor(
  job: Job<QuotaCheckJobData>
): Promise<QuotaCheckResult> {
  const { phoneId, isNewContact, targetTimezone, leadId, tenantId } = job.data;
  
  // Calculate local time for prospect
  const localTime = DateTime.now().setZone(targetTimezone);
  const currentHour = localTime.hour;
  const dateIso = localTime.toISODate();
  const isWeekend = localTime.weekday > 5;

  // Skip weekends
  if (isWeekend) {
    return buildDelayResult(phoneId, 'OUTSIDE_BUSINESS_HOURS', localTime);
  }

  // Execute atomic Lua script
  const quotaKey = `quota:wa:${phoneId}:${dateIso}`;
  const statusKey = `phone:status:${phoneId}`;
  const cost = isNewContact ? 1 : 0;
  const dailyLimit = 200;

  const resultJson = await redis.evalsha(
    quotaCheckSha,
    2,
    quotaKey,
    statusKey,
    dailyLimit.toString(),
    cost.toString(),
    currentHour.toString()
  ) as string;

  const luaResult = JSON.parse(resultJson);

  // Build response
  const result: QuotaCheckResult = {
    allowed: luaResult.allowed,
    reason: luaResult.reason,
    quotaDetails: {
      phoneId,
      currentUsage: luaResult.current_usage,
      dailyLimit,
      remainingQuota: luaResult.remaining,
      quotaResetAt: localTime.plus({ days: 1 }).startOf('day').toISO()!,
    },
    businessHours: {
      isWithinHours: currentHour >= 9 && currentHour < 18,
      currentLocalTime: localTime.toFormat('HH:mm'),
      allowedStart: '09:00',
      allowedEnd: '18:00',
    },
    recommendation: {
      action: luaResult.allowed ? 'PROCEED' : 'DELAY',
    },
  };

  // Calculate delay if not allowed
  if (!result.allowed) {
    if (luaResult.reason === 'OUTSIDE_BUSINESS_HOURS') {
      result.recommendation.delayUntil = getNextBusinessHour(localTime);
    } else if (luaResult.reason === 'QUOTA_EXCEEDED') {
      result.recommendation.delayUntil = localTime
        .plus({ days: 1 })
        .set({ hour: 9, minute: 0 })
        .toISO()!;
      
      // Find alternative phone with available quota
      const altPhone = await findAlternativePhone(tenantId, dailyLimit);
      if (altPhone) {
        result.recommendation.alternativePhoneId = altPhone;
      }
    }
  }

  logger.info({
    leadId,
    phoneId,
    allowed: result.allowed,
    reason: result.reason,
    usage: result.quotaDetails.currentUsage,
    remaining: result.quotaDetails.remainingQuota,
  }, 'Quota check completed');

  return result;
}

function getNextBusinessHour(localTime: DateTime): string {
  let next = localTime.set({ hour: 9, minute: 0, second: 0 });
  
  if (localTime.hour >= 18) {
    next = next.plus({ days: 1 });
  }
  
  // Skip weekends
  while (next.weekday > 5) {
    next = next.plus({ days: 1 });
  }
  
  return next.toISO()!;
}

async function findAlternativePhone(
  tenantId: string, 
  limit: number
): Promise<string | null> {
  const dateIso = DateTime.now().toISODate();
  
  // Find phone with available quota
  const phones = await db.select()
    .from(waPhoneNumbers)
    .where(and(
      eq(waPhoneNumbers.tenantId, tenantId),
      eq(waPhoneNumbers.status, 'ACTIVE')
    ));
  
  for (const phone of phones) {
    const usage = await redis.get(`quota:wa:${phone.id}:${dateIso}`);
    if (!usage || parseInt(usage) < limit) {
      return phone.id;
    }
  }
  
  return null;
}
```

## 2.6 Output Triggers

| Destination Queue | Condition |
|-------------------|-----------|
| `q:wa:phone_{XX}` | If `allowed === true` |
| `outreach:wa:delay` | If `reason === 'QUOTA_EXCEEDED'` |
| `outreach:wa:reschedule` | If `reason === 'OUTSIDE_BUSINESS_HOURS'` |
| `alert:phone:offline` | If `reason === 'PHONE_OFFLINE'` |
| `alert:phone:banned` | If `reason === 'PHONE_BANNED'` |

---

# 3. WORKER #2: quota:guardian:increment

## 3.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `quota:guardian:increment` |
| **Concurrency** | 100 |
| **Timeout** | 500ms |
| **Purpose** | Increment quota after successful send |

## 3.2 Job Input/Output

```typescript
interface QuotaIncrementJobData {
  phoneId: string;
  cost: number;  // 1 for new, 0 for follow-up
  dateIso: string;
}

interface QuotaIncrementResult {
  phoneId: string;
  previousUsage: number;
  newUsage: number;
  costApplied: number;
}
```

## 3.3 Implementation

```typescript
export async function quotaIncrementProcessor(
  job: Job<QuotaIncrementJobData>
): Promise<QuotaIncrementResult> {
  const { phoneId, cost, dateIso } = job.data;
  
  const quotaKey = `quota:wa:${phoneId}:${dateIso}`;
  
  const previousUsage = parseInt(await redis.get(quotaKey) || '0');
  
  if (cost > 0) {
    await redis.incrby(quotaKey, cost);
    await redis.expire(quotaKey, 172800); // 48h TTL
  }
  
  return {
    phoneId,
    previousUsage,
    newUsage: previousUsage + cost,
    costApplied: cost,
  };
}
```

---

# 4. WORKER #3: quota:guardian:reset

## 4.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `quota:guardian:reset` |
| **Concurrency** | 1 |
| **Schedule** | Cron: `0 0 * * *` (daily at 00:00 UTC) |
| **Purpose** | Reset daily quotas and archive stats |

## 4.2 Implementation

```typescript
export async function quotaResetProcessor(
  job: Job
): Promise<void> {
  const yesterday = DateTime.now().minus({ days: 1 }).toISODate();
  const today = DateTime.now().toISODate();
  
  // Get all phone quota keys from yesterday
  const pattern = `quota:wa:*:${yesterday}`;
  const keys = await redis.keys(pattern);
  
  // Archive stats to database
  for (const key of keys) {
    const phoneId = key.split(':')[2];
    const usage = parseInt(await redis.get(key) || '0');
    
    await db.insert(waQuotaUsage).values({
      phoneId,
      usageDate: yesterday,
      newContactsSent: usage,
      quotaLimit: 200,
      quotaRemaining: 200 - usage,
    });
  }
  
  // Delete old keys (auto-expired by TTL, but cleanup anyway)
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  
  logger.info({
    keysArchived: keys.length,
    date: yesterday,
  }, 'Daily quota reset completed');
}
```

---

# 5. WORKER #4: quota:business-hours:check

## 5.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `quota:business-hours:check` |
| **Concurrency** | 100 |
| **Timeout** | 1000ms |
| **Purpose** | Check business hours for prospect timezone |

## 5.2 Job Schema

```typescript
interface BusinessHoursCheckJobData {
  leadId: string;
  timezone: string;
  includeHolidays?: boolean;
}

interface BusinessHoursCheckResult {
  isWithinHours: boolean;
  leadTimezone: string;
  localTime: string;
  nextAvailableSlot: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
}
```

## 5.3 Implementation

```typescript
import { DateTime } from 'luxon';

// Romanian public holidays 2026
const ROMANIAN_HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-02', // Anul Nou
  '2026-01-24', // Ziua Unirii
  '2026-04-13', // Paște Ortodox
  '2026-04-14', // A doua zi de Paște
  '2026-05-01', // Ziua Muncii
  '2026-06-01', // Ziua Copilului / Rusalii
  '2026-06-02', // A doua zi de Rusalii
  '2026-08-15', // Adormirea Maicii Domnului
  '2026-11-30', // Sf. Andrei
  '2026-12-01', // Ziua Națională
  '2026-12-25', '2026-12-26', // Crăciun
];

export async function businessHoursCheckProcessor(
  job: Job<BusinessHoursCheckJobData>
): Promise<BusinessHoursCheckResult> {
  const { timezone, includeHolidays = true } = job.data;
  
  const localTime = DateTime.now().setZone(timezone);
  const dateIso = localTime.toISODate();
  const hour = localTime.hour;
  const weekday = localTime.weekday;
  
  const isWeekend = weekday > 5;
  const isHoliday = includeHolidays && ROMANIAN_HOLIDAYS_2026.includes(dateIso);
  const isWithinHours = hour >= 9 && hour < 18 && !isWeekend && !isHoliday;
  
  // Calculate next available slot
  let nextSlot = localTime;
  if (!isWithinHours) {
    if (hour >= 18) {
      nextSlot = nextSlot.plus({ days: 1 }).set({ hour: 9, minute: 0 });
    } else if (hour < 9) {
      nextSlot = nextSlot.set({ hour: 9, minute: 0 });
    }
    
    // Skip weekends and holidays
    while (nextSlot.weekday > 5 || ROMANIAN_HOLIDAYS_2026.includes(nextSlot.toISODate())) {
      nextSlot = nextSlot.plus({ days: 1 });
    }
  }
  
  return {
    isWithinHours,
    leadTimezone: timezone,
    localTime: localTime.toFormat('HH:mm'),
    nextAvailableSlot: nextSlot.toISO()!,
    isWeekend,
    isHoliday,
    holidayName: isHoliday ? getHolidayName(dateIso) : undefined,
  };
}
```

---

# 6. REDIS KEY PATTERNS

| Pattern | Example | Purpose | TTL |
|---------|---------|---------|-----|
| `quota:wa:{phoneId}:{date}` | `quota:wa:uuid-123:2026-01-15` | Daily quota counter | 48h |
| `phone:status:{phoneId}` | `phone:status:uuid-123` | Phone status | None |
| `phones:available:{tenantId}` | `phones:available:tenant-456` | Sorted set of available phones | None |

---

# 7. METRICS & ALERTS

## 7.1 Prometheus Metrics

```typescript
// Quota usage gauge
const quotaUsage = new Gauge({
  name: 'cerniq_wa_quota_usage',
  help: 'Current WhatsApp quota usage per phone',
  labelNames: ['phone_id', 'tenant_id'],
});

// Quota check results
const quotaCheckTotal = new Counter({
  name: 'cerniq_quota_check_total',
  help: 'Total quota checks',
  labelNames: ['result', 'reason'],
});

// Business hours rejections
const businessHoursRejected = new Counter({
  name: 'cerniq_business_hours_rejected_total',
  help: 'Messages rejected due to business hours',
  labelNames: ['tenant_id'],
});
```

## 7.2 Alert Rules

```yaml
groups:
  - name: quota_guardian
    rules:
      - alert: QuotaNearLimit
        expr: cerniq_wa_quota_usage > 180
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "WhatsApp quota near limit"
          description: "Phone {{ $labels.phone_id }} has used {{ $value }}/200 quota"
      
      - alert: AllPhonesQuotaExhausted
        expr: count(cerniq_wa_quota_usage >= 200) == count(cerniq_wa_quota_usage)
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "All WhatsApp phones quota exhausted"
```

---

**Document generat:** 15 Ianuarie 2026
**Total Workers:** 4
**Conformitate:** Master Spec v1.2
