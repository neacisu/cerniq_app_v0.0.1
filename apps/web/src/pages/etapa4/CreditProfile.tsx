/**
 * CreditProfile — profile din GET /api/v1/credit/profiles; componente radar din score_components JSON.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { fetchCreditProfiles, type CreditProfileListRow } from "@/lib/etapa4-api.js";

type RiskTier = "BLOCKED" | "LOW" | "MEDIUM" | "HIGH" | "PREMIUM";

interface ScoreComponents {
  anafStatus: number;
  financialHealth: number;
  bpiStatus: number;
  paymentHistory: number;
  litigation: number;
  fiscalCompliance: number;
}

interface CreditProfileView {
  profileId: string;
  clientId: string;
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

const SCORE_WEIGHTS = {
  anafStatus: { weight: 15, label: "ANAF Status" },
  financialHealth: { weight: 25, label: "Financial Health" },
  bpiStatus: { weight: 20, label: "BPI Status" },
  paymentHistory: { weight: 20, label: "Payment History" },
  litigation: { weight: 10, label: "Litigation" },
  fiscalCompliance: { weight: 10, label: "TVA/Fiscal" },
} as const;

function parseScoreComponents(raw: unknown, fallback: number): ScoreComponents {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const n = (key: keyof ScoreComponents): number => {
    const v = o[key];
    if (typeof v === "number" && Number.isFinite(v)) return Math.min(100, Math.max(0, v));
    return fallback;
  };
  return {
    anafStatus: n("anafStatus"),
    financialHealth: n("financialHealth"),
    bpiStatus: n("bpiStatus"),
    paymentHistory: n("paymentHistory"),
    litigation: n("litigation"),
    fiscalCompliance: n("fiscalCompliance"),
  };
}

function mapRow(r: CreditProfileListRow): CreditProfileView {
  const tier = r.riskTier as RiskTier;
  const fb = r.creditScore;
  return {
    profileId: r.id,
    clientId: r.clientId,
    company: r.companyName?.trim() ? r.companyName : "—",
    cui: r.cui?.trim() ? r.cui : "—",
    creditScore: r.creditScore,
    riskTier: tier,
    creditLimit: Number(r.creditLimit),
    creditUsed: Number(r.creditUsed),
    scoreComponents: parseScoreComponents(r.scoreComponents, fb),
    bpiStatus: r.bpiStatus?.trim() ? r.bpiStatus : "—",
    nextReviewAt: r.nextReviewAt ? r.nextReviewAt.slice(0, 10) : "—",
    autoRefreshEnabled: r.autoRefreshEnabled,
  };
}

function getScoreColor(v: number): string {
  if (v >= 80) return "var(--color-ok)";
  if (v >= 60) return "var(--color-wa)";
  return "var(--color-er)";
}

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

function CreditProfileCard({
  profile,
  selected,
  onSelect,
}: {
  readonly profile: CreditProfileView;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const usedPercent =
    profile.creditLimit > 0 ? (profile.creditUsed / profile.creditLimit) * 100 : 0;
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
            <span>Utilizat: RON {profile.creditUsed.toLocaleString("ro-RO")}</span>
            <span>Limită: RON {profile.creditLimit.toLocaleString("ro-RO")}</span>
          </div>
          <ProgressBar value={usedPercent} />
        </div>
      </CardBody>
    </Card>
  );
}

export function CreditProfile() {
  const listQuery = useQuery({
    queryKey: ["etapa4", "credit", "profiles", "radar"],
    queryFn: () => fetchCreditProfiles({ limit: 100, page: 1 }),
  });

  const profiles = useMemo(() => (listQuery.data?.data ?? []).map(mapRow), [listQuery.data?.data]);

  const [pickedClientId, setPickedClientId] = useState<string | null>(null);

  const effectiveClientId = useMemo(() => {
    if (profiles.length === 0) return null;
    if (pickedClientId !== null && profiles.some((p) => p.clientId === pickedClientId)) {
      return pickedClientId;
    }
    return profiles[0].clientId;
  }, [profiles, pickedClientId]);

  const selected = useMemo(
    () =>
      effectiveClientId === null
        ? undefined
        : profiles.find((p) => p.clientId === effectiveClientId),
    [profiles, effectiveClientId],
  );

  const radarData = selected
    ? (Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]).map((key) => ({
        subject: SCORE_WEIGHTS[key].label,
        value: selected.scoreComponents[key as keyof ScoreComponents],
        weight: SCORE_WEIGHTS[key].weight,
        fullMark: 100,
      }))
    : [];

  const avgScore = selected
    ? Math.round(
        (Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]).reduce((sum, key) => {
          return (
            sum +
            (selected.scoreComponents[key as keyof ScoreComponents] * SCORE_WEIGHTS[key].weight) /
              100
          );
        }, 0),
      )
    : 0;

  const premiumCount = profiles.filter((p) => p.riskTier === "PREMIUM").length;
  const highRiskCount = profiles.filter((p) => ["HIGH", "BLOCKED"].includes(p.riskTier)).length;
  const totalExposure = profiles.reduce((s, p) => s + p.creditUsed, 0);

  return (
    <PageWrapper title="Credit Profiles" actions={<EtapaBadge label="Etapa 4" />}>
      {listQuery.isError && (
        <div className="mb-4 rounded border border-er/40 bg-er/10 px-4 py-3 text-sm text-er">
          Eroare la încărcarea profilelor.
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Profile total"
          value={String(profiles.length)}
          icon="Users"
          color="var(--color-b5)"
        />
        <KpiCard label="Premium" value={String(premiumCount)} icon="Star" color="var(--color-b5)" />
        <KpiCard
          label="Risc ridicat"
          value={String(highRiskCount)}
          icon="AlertTriangle"
          color="var(--color-er)"
        />
        <KpiCard
          label="Expunere totală"
          value={`RON ${(totalExposure / 1000).toFixed(0)}K`}
          icon="CreditCard"
          color="var(--color-neuron-credit)"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
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
          {listQuery.isSuccess && profiles.length === 0 ? (
            <EmptyState title="Fără profile" description="Nu există gold_credit_profiles." />
          ) : (
            profiles.map((p) => (
              <CreditProfileCard
                key={p.clientId}
                profile={p}
                selected={effectiveClientId === p.clientId}
                onSelect={() => setPickedClientId(p.clientId)}
              />
            ))
          )}
        </div>

        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                        RON {selected.creditUsed.toLocaleString("ro-RO")}
                      </strong>
                    </span>
                    <span style={{ color: "var(--color-t3)" }}>
                      Disponibil:{" "}
                      <strong style={{ color: "var(--color-ok)" }}>
                        RON{" "}
                        {Math.max(0, selected.creditLimit - selected.creditUsed).toLocaleString(
                          "ro-RO",
                        )}
                      </strong>
                    </span>
                    <span style={{ color: "var(--color-t3)" }}>
                      Limită: <strong>RON {selected.creditLimit.toLocaleString("ro-RO")}</strong>
                    </span>
                  </div>
                  <ProgressBar
                    value={
                      selected.creditLimit > 0
                        ? (selected.creditUsed / selected.creditLimit) * 100
                        : 0
                    }
                  />
                </div>
              </CardBody>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Scoring radar</CardTitle>
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
                    Scor ponderat UI:{" "}
                    <strong style={{ color: riskColor(selected.riskTier) }}>{avgScore}/100</strong>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Componente scor</CardTitle>
                </CardHeader>
                <CardBody>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]).map((key) => {
                      const w = SCORE_WEIGHTS[key];
                      const v = selected.scoreComponents[key as keyof ScoreComponents];
                      const sc = getScoreColor(v);
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
                              {v}/100{" "}
                              <span style={{ color: "var(--color-t4)" }}>(×{w.weight}%)</span>
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
                                background: sc,
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
        ) : (
          <Card>
            <CardBody className="py-8">
              <EmptyState title="Selectează un profil" />
            </CardBody>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
