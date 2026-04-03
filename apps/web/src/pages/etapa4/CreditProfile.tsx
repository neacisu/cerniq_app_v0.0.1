/**
 * CreditProfile — E4 Credit Scoring Radar Chart
 *
 * RadarChart Recharts cu 6 axe:
 * - ANAF Status (15%) — stare fiscală, TVA, e-Factura
 * - Financial Health (25%) — cifra afaceri, profitabilitate
 * - BPI Status (20%) — Biroul de Plăți Ineficiente
 * - Payment History (20%) — istoricul plăților cu Cerniq
 * - Litigation (10%) — litigii ANAF/tribunale
 * - TVA/Fiscal (10%) — conformitate TVA și e-Factura
 * Plan: §XII L9480 — "radar chart scoring breakdown"
 * Workers: C13-C18 (credit scoring), D19-D21 (credit reservation)
 */
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { SBadge } from "@/components/ui/badge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Building2, Shield } from "lucide-react";
import { cn } from "@/lib/utils.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskTier = "BLOCKED" | "LOW" | "MEDIUM" | "HIGH" | "PREMIUM";

interface ScoreComponents {
  anafStatus: number;
  financialHealth: number;
  bpiStatus: number;
  paymentHistory: number;
  litigation: number;
  fiscalCompliance: number;
}

interface CreditProfile {
  id: string;
  company: string;
  cui: string;
  creditScore: number;
  riskTier: RiskTier;
  creditLimit: number;
  creditUsed: number;
  scoreComponents: ScoreComponents;
  bpiStatus: string;
  nextReviewAt: string;
  autoRefreshEnabled: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PROFILES: CreditProfile[] = [
  {
    id: "cp-001",
    company: "SC AgroSud SRL",
    cui: "12345678",
    creditScore: 82,
    riskTier: "PREMIUM",
    creditLimit: 50000,
    creditUsed: 23000,
    scoreComponents: {
      anafStatus: 92,
      financialHealth: 88,
      bpiStatus: 75,
      paymentHistory: 95,
      litigation: 100,
      fiscalCompliance: 90,
    },
    bpiStatus: "CLEAN",
    nextReviewAt: "2026-07-01",
    autoRefreshEnabled: true,
  },
  {
    id: "cp-002",
    company: "Cooperativa Agriland",
    cui: "87654321",
    creditScore: 61,
    riskTier: "MEDIUM",
    creditLimit: 20000,
    creditUsed: 18000,
    scoreComponents: {
      anafStatus: 70,
      financialHealth: 55,
      bpiStatus: 60,
      paymentHistory: 72,
      litigation: 80,
      fiscalCompliance: 65,
    },
    bpiStatus: "WATCH",
    nextReviewAt: "2026-05-15",
    autoRefreshEnabled: true,
  },
  {
    id: "cp-003",
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    creditScore: 44,
    riskTier: "HIGH",
    creditLimit: 10000,
    creditUsed: 9000,
    scoreComponents: {
      anafStatus: 45,
      financialHealth: 40,
      bpiStatus: 30,
      paymentHistory: 55,
      litigation: 60,
      fiscalCompliance: 35,
    },
    bpiStatus: "RISK",
    nextReviewAt: "2026-04-30",
    autoRefreshEnabled: false,
  },
  {
    id: "cp-004",
    company: "SC Ferma Dunărea SA",
    cui: "99887766",
    creditScore: 91,
    riskTier: "PREMIUM",
    creditLimit: 100000,
    creditUsed: 45000,
    scoreComponents: {
      anafStatus: 95,
      financialHealth: 92,
      bpiStatus: 88,
      paymentHistory: 98,
      litigation: 100,
      fiscalCompliance: 96,
    },
    bpiStatus: "CLEAN",
    nextReviewAt: "2026-10-01",
    autoRefreshEnabled: true,
  },
];

// ─── Weight config ────────────────────────────────────────────────────────────

const SCORE_WEIGHTS = {
  anafStatus: { weight: 15, label: "ANAF Status" },
  financialHealth: { weight: 25, label: "Financial Health" },
  bpiStatus: { weight: 20, label: "BPI Status" },
  paymentHistory: { weight: 20, label: "Payment History" },
  litigation: { weight: 10, label: "Litigation" },
  fiscalCompliance: { weight: 10, label: "TVA/Fiscal" },
} as const;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getScoreColor(v: number): string {
  if (v >= 80) return "var(--color-ok)";
  if (v >= 60) return "var(--color-wa)";
  return "var(--color-er)";
}

// ─── Risk Tier Color ──────────────────────────────────────────────────────────

function riskColor(tier: RiskTier): string {
  const map: Record<RiskTier, string> = {
    BLOCKED: "var(--color-er)",
    LOW: "var(--color-ok)",
    MEDIUM: "var(--color-wa)",
    HIGH: "oklch(0.6 0.18 25)",
    PREMIUM: "var(--color-b5)",
  };
  return map[tier];
}

// ─── Custom Radar Tooltip ─────────────────────────────────────────────────────

function CustomRadarTooltip({
  active,
  payload,
}: {
  readonly active?: boolean;
  readonly payload?: Array<{
    payload: { subject: string; value: number; weight: number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--color-s800)",
        border: "1px solid var(--color-s700)",
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 11,
      }}
    >
      <div style={{ fontWeight: 600, color: "var(--color-t1)" }}>{data.subject}</div>
      <div style={{ color: "var(--color-b5)" }}>
        {data.value}/100 (pondere {data.weight}%)
      </div>
    </div>
  );
}

// ─── Credit Profile Card ──────────────────────────────────────────────────────

function CreditProfileCard({
  profile,
  selected,
  onSelect,
}: {
  readonly profile: CreditProfile;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const usedPercent = (profile.creditUsed / profile.creditLimit) * 100;
  const color = riskColor(profile.riskTier);

  return (
    <Card
      className={cn("cursor-pointer transition-all", selected && "border-b5")}
      onClick={onSelect}
      style={{
        borderColor: selected ? "var(--color-b5)" : undefined,
        boxShadow: selected ? "0 0 0 1px var(--color-b5)" : undefined,
      }}
    >
      <CardBody className="py-3 px-4">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 6,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-t1)" }}>
              {profile.company}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-t3)", fontFamily: "var(--font-mono)" }}>
              CUI: {profile.cui}
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color,
              fontFamily: "var(--font-mono)",
              lineHeight: 1,
            }}
          >
            {profile.creditScore}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <SBadge status={profile.riskTier} />
          <span style={{ fontSize: 10, color: "var(--color-t3)" }}>BPI: {profile.bpiStatus}</span>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              color: "var(--color-t3)",
              marginBottom: 2,
            }}
          >
            <span>Utilizat: RON {profile.creditUsed.toLocaleString()}</span>
            <span>Limită: RON {profile.creditLimit.toLocaleString()}</span>
          </div>
          <ProgressBar value={usedPercent} />
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CreditProfile() {
  const [selectedId, setSelectedId] = useState<string>("cp-001");
  const selected = MOCK_PROFILES.find((p) => p.id === selectedId) ?? MOCK_PROFILES[0];

  const radarData = (Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]).map((key) => ({
    subject: SCORE_WEIGHTS[key].label,
    value: selected.scoreComponents[key as keyof ScoreComponents],
    weight: SCORE_WEIGHTS[key].weight,
    fullMark: 100,
  }));

  const avgScore = Math.round(
    (Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]).reduce((sum, key) => {
      return (
        sum +
        (selected.scoreComponents[key as keyof ScoreComponents] * SCORE_WEIGHTS[key].weight) / 100
      );
    }, 0),
  );

  const premiumCount = MOCK_PROFILES.filter((p) => p.riskTier === "PREMIUM").length;
  const highRiskCount = MOCK_PROFILES.filter((p) =>
    ["HIGH", "BLOCKED"].includes(p.riskTier),
  ).length;
  const totalExposure = MOCK_PROFILES.reduce((s, p) => s + p.creditUsed, 0);

  return (
    <PageWrapper title="Credit Profiles" actions={<EtapaBadge label="Etapa 4" />}>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Profile Total"
          value={String(MOCK_PROFILES.length)}
          icon="Users"
          color="var(--color-b5)"
        />
        <KpiCard
          label="Premium Tier"
          value={String(premiumCount)}
          icon="Star"
          color="var(--color-b5)"
        />
        <KpiCard
          label="Risc Ridicat"
          value={String(highRiskCount)}
          icon="AlertTriangle"
          color="var(--color-er)"
        />
        <KpiCard
          label="Expunere Totală"
          value={`RON ${(totalExposure / 1000).toFixed(0)}K`}
          icon="CreditCard"
          color="var(--color-neuron-credit)"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
        {/* Left: Profile list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-t3)",
              letterSpacing: "0.05em",
            }}
          >
            PROFILE CREDIT
          </div>
          {MOCK_PROFILES.map((p) => (
            <CreditProfileCard
              key={p.id}
              profile={p}
              selected={selectedId === p.id}
              onSelect={() => setSelectedId(p.id)}
            />
          ))}
        </div>

        {/* Right: Detail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Header card */}
          <Card>
            <CardBody className="py-4 px-5">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Building2 size={18} color="var(--color-neuron-credit)" />
                    <span style={{ fontSize: 16, fontWeight: 800, color: "var(--color-t1)" }}>
                      {selected.company}
                    </span>
                    <SBadge status={selected.riskTier} />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-t3)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    CUI: {selected.cui} • BPI: {selected.bpiStatus} • Review:{" "}
                    {selected.nextReviewAt}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 900,
                      color: riskColor(selected.riskTier),
                      fontFamily: "var(--font-mono)",
                      lineHeight: 1,
                    }}
                  >
                    {selected.creditScore}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-t3)" }}>/ 100</div>
                </div>
              </div>

              {/* Credit utilization */}
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: "var(--color-t3)" }}>
                    Utilizat:{" "}
                    <strong style={{ color: "var(--color-t1)" }}>
                      RON {selected.creditUsed.toLocaleString()}
                    </strong>
                  </span>
                  <span style={{ color: "var(--color-t3)" }}>
                    Disponibil:{" "}
                    <strong style={{ color: "var(--color-ok)" }}>
                      RON {(selected.creditLimit - selected.creditUsed).toLocaleString()}
                    </strong>
                  </span>
                  <span style={{ color: "var(--color-t3)" }}>
                    Limită: <strong>RON {selected.creditLimit.toLocaleString()}</strong>
                  </span>
                </div>
                <ProgressBar value={(selected.creditUsed / selected.creditLimit) * 100} />
              </div>
            </CardBody>
          </Card>

          {/* Radar Chart + Components */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Scoring Radar (6 Axe)</CardTitle>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--color-s700)" strokeDasharray="3 3" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 10, fill: "var(--color-t3)" }}
                    />
                    <Radar
                      name={selected.company}
                      dataKey="value"
                      stroke={riskColor(selected.riskTier)}
                      fill={riskColor(selected.riskTier)}
                      fillOpacity={0.2}
                      strokeWidth={1.5}
                    />
                    <Tooltip content={<CustomRadarTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: "var(--color-t3)",
                    marginTop: 4,
                  }}
                >
                  Scor ponderat:{" "}
                  <strong style={{ color: riskColor(selected.riskTier) }}>{avgScore}/100</strong>
                </div>
              </CardBody>
            </Card>

            {/* Components breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Componente Scor</CardTitle>
              </CardHeader>
              <CardBody>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]).map((key) => {
                    const w = SCORE_WEIGHTS[key];
                    const v = selected.scoreComponents[key as keyof ScoreComponents];
                    const scoreColor = getScoreColor(v);

                    return (
                      <div key={key}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                            marginBottom: 3,
                          }}
                        >
                          <span style={{ color: "var(--color-t2)" }}>{w.label}</span>
                          <span style={{ color: "var(--color-t3)", fontSize: 10 }}>
                            {v}/100 <span style={{ color: "var(--color-t4)" }}>(×{w.weight}%)</span>
                          </span>
                        </div>
                        <div
                          style={{
                            height: 4,
                            borderRadius: 2,
                            background: "var(--color-s700)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${v}%`,
                              background: scoreColor,
                              borderRadius: 2,
                              transition: "width 0.5s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: "8px 10px",
                    background: "var(--color-s800)",
                    borderRadius: 6,
                    fontSize: 10,
                    color: "var(--color-t3)",
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    <Shield size={9} style={{ marginRight: 3 }} />
                    Auto-refresh: {selected.autoRefreshEnabled ? "✓ ON" : "✗ OFF"}
                  </span>
                  <span>Next review: {selected.nextReviewAt}</span>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
