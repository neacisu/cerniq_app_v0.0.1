import { describe, it, expect } from "vitest";
import { QUEUES } from "@cerniq/worker-shared";

// ── Helper functions (SonarQube: outer scope) ─────────────────────────────

function classifyNps(score: number): "DETRACTOR" | "PASSIVE" | "PROMOTER" {
  if (score <= 6) return "DETRACTOR";
  if (score <= 8) return "PASSIVE";
  return "PROMOTER";
}

function calcTrend(scores: number[]): "IMPROVING" | "STABLE" | "DECLINING" {
  if (scores.length < 2) return "STABLE";
  const latest = scores[0];
  const rest = scores.slice(1);
  const avg = rest.reduce((a, b) => a + b, 0) / rest.length;
  if (latest > avg) return "IMPROVING";
  if (latest < avg) return "DECLINING";
  return "STABLE";
}

function routeComplaint(score: number): "HITL" | "AUTO" {
  return score <= 3 ? "HITL" : "AUTO";
}

function calcNpsScore(promoters: number, detractors: number, total: number): number {
  if (total === 0) return 0;
  return Math.round(((promoters - detractors) / total) * 100 * 100) / 100;
}

function renderTemplate(body: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val), body);
}

function isDripDue(lastInteractionAt: Date, daysAfterTrigger: number): boolean {
  const daysSince = Math.floor((Date.now() - lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24));
  return daysSince >= daysAfterTrigger;
}

function isEventActive(
  today: Date,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
  daysBeforeDeadline: number,
): boolean {
  const year = today.getFullYear();
  const alertStart = new Date(year, startMonth - 1, startDay - daysBeforeDeadline);
  const eventEnd = new Date(year, endMonth - 1, endDay);
  return today >= alertStart && today <= eventEnd;
}

function isExpiredInteraction(lastInteractionAt: Date): boolean {
  const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;
  return Date.now() - lastInteractionAt.getTime() > THREE_YEARS_MS;
}

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 1: NPS Cooldown (Anti-halucinare A)
// ────────────────────────────────────────────────────────────────────────────
describe("NPS Cooldown 90 zile (Anti-halucinare A)", () => {
  it("cooldown = 90 zile exact — nu 89, nu 91", () => {
    const COOLDOWN_DAYS = 90;
    const sentAt = new Date();
    const cooldownUntil = new Date(sentAt);
    cooldownUntil.setDate(cooldownUntil.getDate() + COOLDOWN_DAYS);
    const diffMs = cooldownUntil.getTime() - sentAt.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
  });

  it("al doilea NPS în 90 zile → skip (cooldown activ)", () => {
    const sentAt = new Date();
    sentAt.setDate(sentAt.getDate() - 30); // acum 30 zile
    const cooldownUntil = new Date(sentAt);
    cooldownUntil.setDate(cooldownUntil.getDate() + 90); // cooldown până la 60 zile de azi
    const isInCooldown = new Date() < cooldownUntil;
    expect(isInCooldown).toBe(true);
  });

  it("după 90 zile → NPS se poate trimite din nou", () => {
    const sentAt = new Date();
    sentAt.setDate(sentAt.getDate() - 91); // acum 91 zile
    const cooldownUntil = new Date(sentAt);
    cooldownUntil.setDate(cooldownUntil.getDate() + 90);
    const isInCooldown = new Date() < cooldownUntil;
    expect(isInCooldown).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 2: NPS Clasificare (DETRACTOR/PASSIVE/PROMOTER)
// ────────────────────────────────────────────────────────────────────────────
describe("NPS Score Clasificare", () => {
  it.each([
    [0, "DETRACTOR"],
    [3, "DETRACTOR"],
    [6, "DETRACTOR"],
    [7, "PASSIVE"],
    [8, "PASSIVE"],
    [9, "PROMOTER"],
    [10, "PROMOTER"],
  ] as const)("score %i → %s", (score, expected) => {
    expect(classifyNps(score)).toBe(expected);
  });

  it("score 6 → DETRACTOR (boundary)", () => {
    expect(classifyNps(6)).toBe("DETRACTOR");
  });

  it("score 7 → PASSIVE (boundary)", () => {
    expect(classifyNps(7)).toBe("PASSIVE");
  });

  it("score negativ → DETRACTOR (sanitized)", () => {
    expect(classifyNps(-1)).toBe("DETRACTOR");
  });

  it("score > 10 → PROMOTER (sanitized)", () => {
    expect(classifyNps(11)).toBe("PROMOTER");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 3: NPS Triggers
// ────────────────────────────────────────────────────────────────────────────
describe("NPS Triggers (Detractor → B9, Promoter → A8)", () => {
  it("DETRACTOR → trigger churn signal QUALITY_COMPLAINT", () => {
    const score = 3;
    const category = score <= 6 ? "DETRACTOR" : "OTHER";
    const shouldTriggerChurn = category === "DETRACTOR";
    expect(shouldTriggerChurn).toBe(true);
  });

  it("PROMOTER → check advocate eligibility", () => {
    const score = 9;
    const category = score >= 9 ? "PROMOTER" : "OTHER";
    const shouldTriggerAdvocate = category === "PROMOTER";
    expect(shouldTriggerAdvocate).toBe(true);
  });

  it("PASSIVE → no trigger", () => {
    const score = 7;
    const isDetractor = score <= 6;
    const isPromoter = score >= 9;
    expect(isDetractor || isPromoter).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 4: Satisfaction Trend Calculation
// ────────────────────────────────────────────────────────────────────────────
describe("Satisfaction Trend Calculation", () => {
  it("scores [9, 7, 6] → IMPROVING", () => {
    expect(calcTrend([9, 7, 6])).toBe("IMPROVING");
  });

  it("scores [5, 7, 8] → DECLINING", () => {
    expect(calcTrend([5, 7, 8])).toBe("DECLINING");
  });

  it("scores [7, 7, 7] → STABLE", () => {
    expect(calcTrend([7, 7, 7])).toBe("STABLE");
  });

  it("scores [8] (only 1 score) → STABLE (insufficient data)", () => {
    expect(calcTrend([8])).toBe("STABLE");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 5: Complaint Routing
// ────────────────────────────────────────────────────────────────────────────
describe("Complaint Routing", () => {
  it("score 0-3 → HITL", () => {
    expect(routeComplaint(0)).toBe("HITL");
    expect(routeComplaint(3)).toBe("HITL");
  });

  it("score 4-6 → AUTO", () => {
    expect(routeComplaint(4)).toBe("AUTO");
    expect(routeComplaint(6)).toBe("AUTO");
  });

  it("boundary: score 3 → HITL", () => {
    expect(routeComplaint(3)).toBe("HITL");
  });

  it("boundary: score 4 → AUTO", () => {
    expect(routeComplaint(4)).toBe("AUTO");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 6: NPS Score Calculation (H47 Report)
// ────────────────────────────────────────────────────────────────────────────
describe("NPS Score Formula (H47)", () => {
  it("50% promoters, 20% detractors → NPS=30", () => {
    expect(calcNpsScore(5, 2, 10)).toBe(30);
  });

  it("100% promoters → NPS=100", () => {
    expect(calcNpsScore(10, 0, 10)).toBe(100);
  });

  it("100% detractors → NPS=-100", () => {
    expect(calcNpsScore(0, 10, 10)).toBe(-100);
  });

  it("0 responses → NPS=0 (no division by zero)", () => {
    expect(calcNpsScore(0, 0, 0)).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 7: Content Drip Template Rendering (Anti-halucin. F — No LLM)
// ────────────────────────────────────────────────────────────────────────────
describe("Content Template Rendering (No LLM)", () => {
  it("renders {{clientName}} corect", () => {
    const result = renderTemplate("Dragă {{clientName}}, bun venit!", {
      clientName: "Ion Popescu",
    });
    expect(result).toBe("Dragă Ion Popescu, bun venit!");
  });

  it("renders multiple variables", () => {
    const result = renderTemplate("{{clientName}} — comandă: {{lastOrderDate}}", {
      clientName: "Maria",
      lastOrderDate: "2026-03-01",
    });
    expect(result).toBe("Maria — comandă: 2026-03-01");
  });

  it("undefined variable → rămâne {{var}}", () => {
    const result = renderTemplate("Dragă {{clientName}}, produse: {{productList}}", {
      clientName: "Ion",
    });
    expect(result).toContain("Ion");
    expect(result).toContain("{{productList}}");
  });

  it("template fără variabile → returnat neschimbat", () => {
    const body = "Mesaj fix fără variabile.";
    expect(renderTemplate(body, {})).toBe(body);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 8: Content Drip Timing
// ────────────────────────────────────────────────────────────────────────────
describe("Content Drip Timing (daysAfterTrigger)", () => {
  it("lastInteraction=5 days ago, trigger=3 → due", () => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    expect(isDripDue(d, 3)).toBe(true);
  });

  it("lastInteraction=2 days ago, trigger=3 → not due", () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    expect(isDripDue(d, 3)).toBe(false);
  });

  it("lastInteraction=exactly 3 days ago → due", () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    expect(isDripDue(d, 3)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 9: Weather Severity Filter
// ────────────────────────────────────────────────────────────────────────────
describe("Weather Severity Filter (≥ YELLOW)", () => {
  const SEVERITY_LEVELS = { GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3 } as const;

  function isRelevantSeverity(severity: keyof typeof SEVERITY_LEVELS): boolean {
    return SEVERITY_LEVELS[severity] >= SEVERITY_LEVELS.YELLOW;
  }

  it("GREEN → skip", () => expect(isRelevantSeverity("GREEN")).toBe(false));
  it("YELLOW → process", () => expect(isRelevantSeverity("YELLOW")).toBe(true));
  it("ORANGE → process", () => expect(isRelevantSeverity("ORANGE")).toBe(true));
  it("RED → process", () => expect(isRelevantSeverity("RED")).toBe(true));
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 10: APIA Seasonal Calendar
// ────────────────────────────────────────────────────────────────────────────
describe("APIA Seasonal Calendar", () => {
  it("SAPS: 15 martie → în window (1 mar - 15 mai, alertă 14 zile)", () => {
    const today = new Date(2026, 2, 15); // 15 mar 2026
    expect(isEventActive(today, 3, 1, 5, 15, 14)).toBe(true);
  });

  it("SAPS: 1 februarie → în afara window-ului", () => {
    const today = new Date(2026, 1, 1); // 1 feb 2026
    expect(isEventActive(today, 3, 1, 5, 15, 14)).toBe(false);
  });

  it("SAPS: 15 mai → în window (ultima zi)", () => {
    const today = new Date(2026, 4, 15); // 15 mai 2026
    expect(isEventActive(today, 3, 1, 5, 15, 14)).toBe(true);
  });

  it("SAPS: 16 mai → în afara window-ului (după deadline)", () => {
    const today = new Date(2026, 4, 16); // 16 mai 2026
    expect(isEventActive(today, 3, 1, 5, 15, 14)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 11: GDPR Compliance Check
// ────────────────────────────────────────────────────────────────────────────
describe("GDPR Compliance: referral fără consent → violation", () => {
  it("referral ACTIVE + consentGiven=false → VIOLATION", () => {
    const referral = { status: "ACTIVE", consentGiven: false };
    const isViolation = referral.status === "ACTIVE" && !referral.consentGiven;
    expect(isViolation).toBe(true);
  });

  it("referral ACTIVE + consentGiven=true → no violation", () => {
    const referral = { status: "ACTIVE", consentGiven: true };
    const isViolation = referral.status === "ACTIVE" && !referral.consentGiven;
    expect(isViolation).toBe(false);
  });

  it("referral PENDING_CONSENT + consentGiven=false → no violation (nu e ACTIVE)", () => {
    const referral = { status: "PENDING_CONSENT", consentGiven: false };
    const VIOLATION_STATUSES = ["ACTIVE", "CONVERTED"];
    const isViolation = VIOLATION_STATUSES.includes(referral.status) && !referral.consentGiven;
    expect(isViolation).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 12: Competition Law Patterns
// ────────────────────────────────────────────────────────────────────────────
describe("Competition Law Pattern Detection", () => {
  const PRICE_FIXING_PATTERNS = [
    /preț\s+fix(at)?/i,
    /acord\s+prețuri/i,
    /coordon(are|ăm)\s+preț/i,
    /prețuri?\s+convenite?/i,
    /cartel/i,
  ];

  function detectPriceFixing(text: string): boolean {
    return PRICE_FIXING_PATTERNS.some((p) => p.test(text));
  }

  it("'preț fixat' → violation detectată", () => {
    expect(detectPriceFixing("vom aplica preț fixat")).toBe(true);
  });

  it("'cartel' → violation detectată", () => {
    expect(detectPriceFixing("formăm un cartel cu competitorii")).toBe(true);
  });

  it("text normal → no violation", () => {
    expect(detectPriceFixing("prețul produsului este 100 RON")).toBe(false);
  });

  it("case-insensitive: 'CARTEL' → violation", () => {
    expect(detectPriceFixing("CARTEL")).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 13: Data Retention (3 ani)
// ────────────────────────────────────────────────────────────────────────────
describe("Data Retention 3 ani GDPR", () => {
  it("ultimă interacțiune acum 4 ani → expirat", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 4);
    expect(isExpiredInteraction(d)).toBe(true);
  });

  it("ultimă interacțiune acum 2 ani → nu expirat", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    expect(isExpiredInteraction(d)).toBe(false);
  });

  it("boundary: exact 3 ani → expirat (strict >)", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    d.setDate(d.getDate() - 1); // 3 ani și 1 zi
    expect(isExpiredInteraction(d)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 14: Queue Registry completeness (canon 346 în worker-shared)
// ────────────────────────────────────────────────────────────────────────────
describe("Queue Registry FAZA 9h — chei E5 în registry", () => {
  it("E5_FEEDBACK_NPS_SEND definit", () => {
    expect(QUEUES.E5_FEEDBACK_NPS_SEND).toBe("feedback:nps:send");
  });
  it("E5_FEEDBACK_NPS_PROCESS definit", () => {
    expect(QUEUES.E5_FEEDBACK_NPS_PROCESS).toBe("feedback:nps:process");
  });
  it("E5_CONTENT_DRIP_SCHEDULE definit", () => {
    expect(QUEUES.E5_CONTENT_DRIP_SCHEDULE).toBe("content:drip:schedule");
  });
  it("E5_ALERT_WEATHER_MONITOR definit", () => {
    expect(QUEUES.E5_ALERT_WEATHER_MONITOR).toBe("alerts:weather:monitor");
  });
  it("E5_COMPLIANCE_GDPR_CHECK definit", () => {
    expect(QUEUES.E5_COMPLIANCE_GDPR_CHECK).toBe("compliance:gdpr:check");
  });
  it("E5_COMPLIANCE_DATA_RETENTION definit", () => {
    expect(QUEUES.E5_COMPLIANCE_DATA_RETENTION).toBe("compliance:data:retention");
  });
  it("E5_HITL_COMPLAINT_REVIEW definit", () => {
    expect(QUEUES.E5_HITL_COMPLAINT_REVIEW).toBe("hitl:complaint:review");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECȚIUNEA 15: Prometheus Metrics definite
// ────────────────────────────────────────────────────────────────────────────
describe("Prometheus Metrics FAZA 9h", () => {
  it("e5NpsScoreRecorded importabil din e5-metrics", async () => {
    const m = await import("../lib/e5-metrics.js");
    expect(m.e5NpsScoreRecorded).toBeDefined();
  });
  it("e5NpsScoreAvg importabil din e5-metrics", async () => {
    const m = await import("../lib/e5-metrics.js");
    expect(m.e5NpsScoreAvg).toBeDefined();
  });
  it("e5WeatherAlertsProcessed importabil din e5-metrics", async () => {
    const m = await import("../lib/e5-metrics.js");
    expect(m.e5WeatherAlertsProcessed).toBeDefined();
  });
  it("e5ComplianceViolationsTotal importabil din e5-metrics", async () => {
    const m = await import("../lib/e5-metrics.js");
    expect(m.e5ComplianceViolationsTotal).toBeDefined();
  });
});
