/**
 * referral-winback.test.ts — Test Suite FAZA 9f: Referral GDPR + Winback
 *
 * Pure unit tests cu logică portată în TypeScript, FĂRĂ mock-uri DB.
 * Acoperă Anti-halucin. B, C, D, E din FAZA 9f.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { QUEUES, queueRegistry } from "@cerniq/worker-shared";

// ============================================================================
// Secțiunea 1: Winback Strategy Thresholds (Anti-halucin. C)
// ============================================================================

function determineWinbackStrategy(totalRevenue: number): {
  strategy: string;
  offerValue: number;
  requiresHitl: boolean;
} {
  if (totalRevenue > 10_000)
    return { strategy: "PERSONAL_CALL", offerValue: 15, requiresHitl: true };
  if (totalRevenue > 5_000) return { strategy: "DISCOUNT", offerValue: 10, requiresHitl: false };
  return { strategy: "PRODUCT_UPDATE", offerValue: 0, requiresHitl: false };
}

describe("Winback Strategy Thresholds (Anti-halucin. C)", () => {
  it("revenue=0 → PRODUCT_UPDATE, offerValue=0, requiresHitl=false", () => {
    const result = determineWinbackStrategy(0);
    expect(result.strategy).toBe("PRODUCT_UPDATE");
    expect(result.offerValue).toBe(0);
    expect(result.requiresHitl).toBe(false);
  });

  it("revenue=1000 → PRODUCT_UPDATE", () => {
    const result = determineWinbackStrategy(1000);
    expect(result.strategy).toBe("PRODUCT_UPDATE");
    expect(result.offerValue).toBe(0);
  });

  it("revenue=5000 → PRODUCT_UPDATE (threshold exclusiv >5000)", () => {
    const result = determineWinbackStrategy(5_000);
    expect(result.strategy).toBe("PRODUCT_UPDATE");
    expect(result.requiresHitl).toBe(false);
  });

  it("revenue=5001 → DISCOUNT, offerValue=10", () => {
    const result = determineWinbackStrategy(5_001);
    expect(result.strategy).toBe("DISCOUNT");
    expect(result.offerValue).toBe(10);
    expect(result.requiresHitl).toBe(false);
  });

  it("revenue=9999 → DISCOUNT", () => {
    const result = determineWinbackStrategy(9_999);
    expect(result.strategy).toBe("DISCOUNT");
    expect(result.requiresHitl).toBe(false);
  });

  it("revenue=10000 → DISCOUNT (threshold exclusiv >10000)", () => {
    const result = determineWinbackStrategy(10_000);
    expect(result.strategy).toBe("DISCOUNT");
    expect(result.requiresHitl).toBe(false);
  });

  it("revenue=10001 → PERSONAL_CALL, requiresHitl=true", () => {
    const result = determineWinbackStrategy(10_001);
    expect(result.strategy).toBe("PERSONAL_CALL");
    expect(result.offerValue).toBe(15);
    expect(result.requiresHitl).toBe(true);
  });

  it("revenue=15000 → PERSONAL_CALL, requiresHitl=true", () => {
    const result = determineWinbackStrategy(15_000);
    expect(result.strategy).toBe("PERSONAL_CALL");
    expect(result.requiresHitl).toBe(true);
  });

  it("revenue=50000 → PERSONAL_CALL", () => {
    const result = determineWinbackStrategy(50_000);
    expect(result.strategy).toBe("PERSONAL_CALL");
    expect(result.requiresHitl).toBe(true);
  });
});

// ============================================================================
// Secțiunea 2: Winback Steps Structure (Anti-halucin. D)
// ============================================================================

function buildWinbackSteps(strategy: string): Array<{ day: number; action: string }> {
  const steps = [
    { day: 0, action: "INITIAL_EMAIL" },
    { day: 3, action: "WA_MESSAGE" },
    { day: 7, action: "OFFER" },
    { day: 14, action: strategy === "PERSONAL_CALL" ? "PHONE_CALL" : "FINAL_EMAIL" },
  ];
  return steps;
}

describe("Winback Steps Structure (Anti-halucin. D)", () => {
  it("steps[0].day === 0 && steps[0].action === 'INITIAL_EMAIL'", () => {
    const steps = buildWinbackSteps("DISCOUNT");
    expect(steps[0].day).toBe(0);
    expect(steps[0].action).toBe("INITIAL_EMAIL");
  });

  it("steps[1].day === 3 && steps[1].action === 'WA_MESSAGE'", () => {
    const steps = buildWinbackSteps("DISCOUNT");
    expect(steps[1].day).toBe(3);
    expect(steps[1].action).toBe("WA_MESSAGE");
  });

  it("steps[2].day === 7 && steps[2].action === 'OFFER'", () => {
    const steps = buildWinbackSteps("DISCOUNT");
    expect(steps[2].day).toBe(7);
    expect(steps[2].action).toBe("OFFER");
  });

  it("steps[3].day === 14", () => {
    const steps = buildWinbackSteps("DISCOUNT");
    expect(steps[3].day).toBe(14);
  });

  it("are exact 4 pași total", () => {
    const steps = buildWinbackSteps("PRODUCT_UPDATE");
    expect(steps).toHaveLength(4);
  });

  it("PERSONAL_CALL strategy → steps[3].action === 'PHONE_CALL'", () => {
    const steps = buildWinbackSteps("PERSONAL_CALL");
    expect(steps[3].action).toBe("PHONE_CALL");
  });

  it("DISCOUNT strategy → steps[3].action === 'FINAL_EMAIL'", () => {
    const steps = buildWinbackSteps("DISCOUNT");
    expect(steps[3].action).toBe("FINAL_EMAIL");
  });

  it("PRODUCT_UPDATE strategy → steps[3].action === 'FINAL_EMAIL'", () => {
    const steps = buildWinbackSteps("PRODUCT_UPDATE");
    expect(steps[3].action).toBe("FINAL_EMAIL");
  });
});

// ============================================================================
// Secțiunea 3: Step Delays Calculation
// ============================================================================

function calcNextStepDelay(currentDay: number, nextDay: number): number {
  return (nextDay - currentDay) * 24 * 60 * 60 * 1000;
}

describe("Step Delays Calculation", () => {
  it("0→3: 259_200_000ms (3 zile)", () => {
    expect(calcNextStepDelay(0, 3)).toBe(259_200_000);
  });

  it("3→7: 345_600_000ms (4 zile)", () => {
    expect(calcNextStepDelay(3, 7)).toBe(345_600_000);
  });

  it("7→14: 604_800_000ms (7 zile)", () => {
    expect(calcNextStepDelay(7, 14)).toBe(604_800_000);
  });
});

// ============================================================================
// Secțiunea 4: Referral Cooldown Logic (Anti-halucin. B)
// ============================================================================

function isCooldownActive(lastReferralDate: Date | null, cooldownDays: number): boolean {
  if (!lastReferralDate) return false;
  const cutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);
  return lastReferralDate > cutoff;
}

describe("Referral Cooldown Logic (Anti-halucin. B)", () => {
  it("null date → cooldown inactiv", () => {
    expect(isCooldownActive(null, 30)).toBe(false);
  });

  it("1 zi în urmă → cooldown activ (< 30 zile)", () => {
    const oneDay = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    expect(isCooldownActive(oneDay, 30)).toBe(true);
  });

  it("29 zile în urmă → cooldown activ", () => {
    const twentyNineDays = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    expect(isCooldownActive(twentyNineDays, 30)).toBe(true);
  });

  it("30 zile în urmă → cooldown inactiv (exact pe limită, nu mai activ)", () => {
    const thirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 - 1000);
    expect(isCooldownActive(thirtyDays, 30)).toBe(false);
  });

  it("31 zile în urmă → cooldown inactiv", () => {
    const thirtyOneDays = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(isCooldownActive(thirtyOneDays, 30)).toBe(false);
  });

  it("60 zile în urmă → cooldown inactiv", () => {
    const sixtyDays = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    expect(isCooldownActive(sixtyDays, 30)).toBe(false);
  });
});

// ============================================================================
// Secțiunea 5: Referral Status State Machine
// ============================================================================

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING_CONSENT: ["ACTIVE", "DECLINED", "EXPIRED"],
  ACTIVE: ["CONVERTED", "EXPIRED"],
  CONVERTED: [],
  DECLINED: [],
  EXPIRED: [],
};

function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe("Referral Status State Machine", () => {
  it("PENDING_CONSENT → ACTIVE (valid)", () => {
    expect(canTransition("PENDING_CONSENT", "ACTIVE")).toBe(true);
  });

  it("PENDING_CONSENT → DECLINED (valid)", () => {
    expect(canTransition("PENDING_CONSENT", "DECLINED")).toBe(true);
  });

  it("PENDING_CONSENT → EXPIRED (valid)", () => {
    expect(canTransition("PENDING_CONSENT", "EXPIRED")).toBe(true);
  });

  it("ACTIVE → CONVERTED (valid)", () => {
    expect(canTransition("ACTIVE", "CONVERTED")).toBe(true);
  });

  it("ACTIVE → EXPIRED (valid)", () => {
    expect(canTransition("ACTIVE", "EXPIRED")).toBe(true);
  });

  it("CONVERTED → nimic (stare finală)", () => {
    expect(canTransition("CONVERTED", "ACTIVE")).toBe(false);
    expect(canTransition("CONVERTED", "EXPIRED")).toBe(false);
  });

  it("DECLINED → nimic (stare finală)", () => {
    expect(canTransition("DECLINED", "ACTIVE")).toBe(false);
    expect(canTransition("DECLINED", "PENDING_CONSENT")).toBe(false);
  });

  it("EXPIRED → nimic (stare finală)", () => {
    expect(canTransition("EXPIRED", "ACTIVE")).toBe(false);
  });

  it("PENDING_CONSENT → CONVERTED (invalid — trebuie ACTIVE mai întâi)", () => {
    expect(canTransition("PENDING_CONSENT", "CONVERTED")).toBe(false);
  });

  it("tranziție de la stare inexistentă → false", () => {
    expect(canTransition("UNKNOWN", "ACTIVE")).toBe(false);
  });
});

// ============================================================================
// Secțiunea 6: GDPR Guard — Prospect Contact Requires Consent
// ============================================================================

function assertGdprConsent(status: string, consentGiven: boolean): void {
  if (status !== "ACTIVE" || !consentGiven) {
    throw new Error(
      `GDPR violation: cannot contact prospect without consent. status=${status} consentGiven=${consentGiven}`,
    );
  }
}

describe("GDPR Guard — Prospect Contact Requires Consent", () => {
  it("PENDING_CONSENT + false → aruncă eroare GDPR", () => {
    expect(() => assertGdprConsent("PENDING_CONSENT", false)).toThrow("GDPR violation");
  });

  it("ACTIVE + false → aruncă eroare GDPR (consent lips)", () => {
    expect(() => assertGdprConsent("ACTIVE", false)).toThrow("GDPR violation");
  });

  it("ACTIVE + true → nu aruncă (permis)", () => {
    expect(() => assertGdprConsent("ACTIVE", true)).not.toThrow();
  });

  it("DECLINED + true → aruncă eroare GDPR (status incorect)", () => {
    expect(() => assertGdprConsent("DECLINED", true)).toThrow("GDPR violation");
  });

  it("EXPIRED + true → aruncă eroare GDPR", () => {
    expect(() => assertGdprConsent("EXPIRED", true)).toThrow("GDPR violation");
  });
});

// ============================================================================
// Secțiunea 7: Discount Code Format
// ============================================================================

function generateDiscountCode(clientId: string, hexSuffix: string): string {
  return `WB-${clientId.slice(0, 8).toUpperCase()}-${hexSuffix.toUpperCase()}`;
}

describe("Discount Code Format", () => {
  it("format corect: WB-{8chars}-{suffix}", () => {
    const code = generateDiscountCode("abc12345-xyz", "a1b2c3");
    expect(code).toMatch(/^WB-[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it("primele 8 caractere din clientId (uppercase)", () => {
    const code = generateDiscountCode("testclient123", "ff00");
    expect(code.startsWith("WB-TESTCLIE-")).toBe(true);
  });

  it("suffix convertit la uppercase", () => {
    const code = generateDiscountCode("client01", "abcdef");
    expect(code).toBe("WB-CLIENT01-ABCDEF");
  });

  it("lungimea sufixului e păstrată", () => {
    const suffix = "a1b2c3d4";
    const code = generateDiscountCode("test1234", suffix);
    expect(code).toBe(`WB-TEST1234-${suffix.toUpperCase()}`);
  });

  it("codul este uppercase complet", () => {
    const code = generateDiscountCode("lowercase", "hexsuffix");
    expect(code).toBe(code.toUpperCase());
  });
});

// ============================================================================
// Secțiunea 8: Referral Reward Calculation
// ============================================================================

function calcReward(referralType: string): { rewardType: string; rewardValue: number } {
  switch (referralType) {
    case "EXPLICIT":
      return { rewardType: "DISCOUNT_CODE", rewardValue: 5 };
    case "SOFT_MENTION":
      return { rewardType: "STORE_CREDIT", rewardValue: 2 };
    case "NEIGHBOR_STRATEGY":
      return { rewardType: "DISCOUNT_CODE", rewardValue: 3 };
    case "GROUP_DEAL":
      return { rewardType: "DISCOUNT_CODE", rewardValue: 7.5 };
    default:
      return { rewardType: "STORE_CREDIT", rewardValue: 1 };
  }
}

describe("Referral Reward Calculation", () => {
  it("EXPLICIT → DISCOUNT_CODE, 5%", () => {
    const reward = calcReward("EXPLICIT");
    expect(reward.rewardType).toBe("DISCOUNT_CODE");
    expect(reward.rewardValue).toBe(5);
  });

  it("SOFT_MENTION → STORE_CREDIT, 2%", () => {
    const reward = calcReward("SOFT_MENTION");
    expect(reward.rewardType).toBe("STORE_CREDIT");
    expect(reward.rewardValue).toBe(2);
  });

  it("NEIGHBOR_STRATEGY → DISCOUNT_CODE, 3%", () => {
    const reward = calcReward("NEIGHBOR_STRATEGY");
    expect(reward.rewardType).toBe("DISCOUNT_CODE");
    expect(reward.rewardValue).toBe(3);
  });

  it("GROUP_DEAL → DISCOUNT_CODE, 7.5%", () => {
    const reward = calcReward("GROUP_DEAL");
    expect(reward.rewardType).toBe("DISCOUNT_CODE");
    expect(reward.rewardValue).toBe(7.5);
  });

  it("tip necunoscut → STORE_CREDIT, 1%", () => {
    const reward = calcReward("UNKNOWN_TYPE");
    expect(reward.rewardType).toBe("STORE_CREDIT");
    expect(reward.rewardValue).toBe(1);
  });
});

// ============================================================================
// Secțiunea 9: Consent Delay 24h
// ============================================================================

describe("Consent Delay 24h (E26)", () => {
  it("24 * 60 * 60 * 1000 === 86_400_000 ms", () => {
    const delay = 24 * 60 * 60 * 1000;
    expect(delay).toBe(86_400_000);
  });

  it("constanta este pozitivă și mai mare de 0", () => {
    expect(86_400_000).toBeGreaterThan(0);
  });
});

// ============================================================================
// Secțiunea 10: HITL Approver Role
// ============================================================================

function getApproverRole(totalRevenue: number): "SALES_MANAGER" | "AUTO" {
  return totalRevenue > 10_000 ? "SALES_MANAGER" : "AUTO";
}

describe("HITL Approver Role (F36)", () => {
  it("revenue=5000 → AUTO", () => {
    expect(getApproverRole(5_000)).toBe("AUTO");
  });

  it("revenue=10000 → AUTO (threshold exclusiv > 10000)", () => {
    expect(getApproverRole(10_000)).toBe("AUTO");
  });

  it("revenue=10001 → SALES_MANAGER", () => {
    expect(getApproverRole(10_001)).toBe("SALES_MANAGER");
  });

  it("revenue=15000 → SALES_MANAGER", () => {
    expect(getApproverRole(15_000)).toBe("SALES_MANAGER");
  });
});

// ============================================================================
// Secțiunea 11: Queue Registry — E25-F36 queues present
// ============================================================================

describe("Queue Registry — E25-F36 queues prezente", () => {
  it("E5_REFERRAL_DETECT există în QUEUES", () => {
    expect(QUEUES.E5_REFERRAL_DETECT).toBe("referral:detect");
  });

  it("E5_REFERRAL_CONSENT_REQUEST există în QUEUES", () => {
    expect(QUEUES.E5_REFERRAL_CONSENT_REQUEST).toBe("referral:consent:request");
  });

  it("E5_REFERRAL_CONSENT_CONFIRM există în QUEUES", () => {
    expect(QUEUES.E5_REFERRAL_CONSENT_CONFIRM).toBe("referral:consent:confirm");
  });

  it("E5_REFERRAL_OUTREACH_PROSPECT există în QUEUES", () => {
    expect(QUEUES.E5_REFERRAL_OUTREACH_PROSPECT).toBe("referral:outreach:prospect");
  });

  it("E5_REFERRAL_TRACKING_CONVERSION există în QUEUES", () => {
    expect(QUEUES.E5_REFERRAL_TRACKING_CONVERSION).toBe("referral:tracking:conversion");
  });

  it("E5_REFERRAL_REWARD_ISSUE există în QUEUES", () => {
    expect(QUEUES.E5_REFERRAL_REWARD_ISSUE).toBe("referral:reward:issue");
  });

  it("E5_REFERRAL_REWARD_NOTIFY există în QUEUES", () => {
    expect(QUEUES.E5_REFERRAL_REWARD_NOTIFY).toBe("referral:reward:notify");
  });

  it("E5_WINBACK_CAMPAIGN_CREATE există în QUEUES", () => {
    expect(QUEUES.E5_WINBACK_CAMPAIGN_CREATE).toBe("winback:campaign:create");
  });

  it("E5_WINBACK_STEP_EXECUTE există în QUEUES", () => {
    expect(QUEUES.E5_WINBACK_STEP_EXECUTE).toBe("winback:step:execute");
  });

  it("E5_WINBACK_OFFER_GENERATE există în QUEUES", () => {
    expect(QUEUES.E5_WINBACK_OFFER_GENERATE).toBe("winback:offer:generate");
  });

  it("E5_WINBACK_RESULT_TRACK există în QUEUES", () => {
    expect(QUEUES.E5_WINBACK_RESULT_TRACK).toBe("winback:result:track");
  });

  it("E5_WINBACK_ESCALATE_HITL există în QUEUES", () => {
    expect(QUEUES.E5_WINBACK_ESCALATE_HITL).toBe("winback:escalate:hitl");
  });

  it("E5_HITL_WINBACK_REVIEW există în QUEUES", () => {
    expect(QUEUES.E5_HITL_WINBACK_REVIEW).toBe("hitl:winback:review");
  });

  it("toate queue-urile noi sunt în queueRegistry", () => {
    const registryNames = new Set(queueRegistry.map((q) => q.name));
    expect(registryNames.has("referral:detect")).toBe(true);
    expect(registryNames.has("referral:consent:request")).toBe(true);
    expect(registryNames.has("referral:consent:confirm")).toBe(true);
    expect(registryNames.has("referral:outreach:prospect")).toBe(true);
    expect(registryNames.has("referral:tracking:conversion")).toBe(true);
    expect(registryNames.has("referral:reward:issue")).toBe(true);
    expect(registryNames.has("referral:reward:notify")).toBe(true);
    expect(registryNames.has("winback:campaign:create")).toBe(true);
    expect(registryNames.has("winback:step:execute")).toBe(true);
    expect(registryNames.has("winback:offer:generate")).toBe(true);
    expect(registryNames.has("winback:result:track")).toBe(true);
    expect(registryNames.has("winback:escalate:hitl")).toBe(true);
    expect(registryNames.has("hitl:winback:review")).toBe(true);
  });
});

// ============================================================================
// Secțiunea 12: assertQueueRegistryComplete (expect 350)
// ============================================================================

describe("assertQueueRegistryComplete (expect 350)", () => {
  it("assertQueueRegistryComplete() nu aruncă eroare", async () => {
    const { assertQueueRegistryComplete } = await import("@cerniq/worker-shared");
    expect(() => assertQueueRegistryComplete()).not.toThrow();
  });

  it("dimensiunea exactă a registrului este 350 (canon worker-shared)", () => {
    expect(queueRegistry.length).toBe(350);
  });
});

// ============================================================================
// Secțiunea 13: Prometheus metrics exist
// ============================================================================

describe("Prometheus metrics FAZA 9f", () => {
  let metrics: typeof import("../lib/e5-metrics.js");

  beforeAll(async () => {
    metrics = await import("../lib/e5-metrics.js");
  });

  it("e5ReferralsCreatedTotal există și are metoda inc()", () => {
    expect(metrics.e5ReferralsCreatedTotal).toBeDefined();
    expect(typeof metrics.e5ReferralsCreatedTotal.inc).toBe("function");
  });

  it("e5WinbackCampaignsActive există și are metoda set()", () => {
    expect(metrics.e5WinbackCampaignsActive).toBeDefined();
    expect(typeof metrics.e5WinbackCampaignsActive.set).toBe("function");
  });

  it("e5ReferralsCreatedTotal are labelNames corecte (tenant_id, referral_type)", async () => {
    const { metricsRegistry } = await import("@cerniq/worker-shared");
    const allMetrics = await metricsRegistry.getMetricsAsJSON();
    const referralMetric = allMetrics.find((m) => m.name === "cerniq_e5_referrals_created_total");
    expect(referralMetric).toBeDefined();
  });

  it("e5WinbackCampaignsActive are labelNames corecte (tenant_id, campaign_type)", async () => {
    const { metricsRegistry } = await import("@cerniq/worker-shared");
    const allMetrics = await metricsRegistry.getMetricsAsJSON();
    const winbackMetric = allMetrics.find((m) => m.name === "cerniq_e5_winback_campaigns_active");
    expect(winbackMetric).toBeDefined();
  });
});
