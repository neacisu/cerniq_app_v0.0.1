/**
 * ReferralManager — E5 GDPR Consent Flow + Referral Funnel
 *
 * Stepper GDPR: Consent Request → Consent Confirm → Outreach Prospect → Conversion Tracking → Reward
 * Funnel: Detectat → Consimțit → Contactat → Convertit → Recompensat
 * Plan: §XII L9483 — "GDPR consent flow + funnel"
 * Workers: E25-E31 (referral pipeline, GDPR consent, reward)
 * Conformitate: Art.6(1)(a) GDPR — consimțământ explicit
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchReferralsList, type ReferralListRow } from "@/lib/etapa5-api.js";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { SBadge } from "@/components/ui/badge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Shield,
  Users,
  Gift,
  TrendingUp,
  AlertTriangle,
  User,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConsentStatus = "PENDING" | "REQUESTED" | "CONFIRMED" | "DECLINED" | "REFUSED" | "EXPIRED";

type ReferralStatus =
  | "DETECTED"
  | "CONSENT_PENDING"
  | "CONSENTED"
  | "OUTREACH"
  | "CONVERTED"
  | "REWARDED"
  | "REJECTED"
  | "CANCELLED";

interface ReferralEntry {
  id: string;
  referrerCompany: string;
  referrerCui: string;
  prospectCompany: string;
  prospectContact: string;
  consentStatus: ConsentStatus;
  referralStatus: ReferralStatus;
  consentRequestedAt?: string;
  consentConfirmedAt?: string;
  conversionValue?: number;
  rewardAmount?: number;
  rewardPaid: boolean;
  gdprBasis: string;
  detectedAt: string;
}

// ─── GDPR Consent Steps ───────────────────────────────────────────────────────

const CONSENT_STEPS: ReadonlyArray<{
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly worker: string;
}> = [
  { id: "detect", label: "Detectat", icon: Users, worker: "E25" },
  { id: "consent_req", label: "Consimț. Cerut", icon: Shield, worker: "E26" },
  { id: "consent_ok", label: "Consimț. Confirmat", icon: CheckCircle2, worker: "E27" },
  { id: "outreach", label: "Prospectat", icon: User, worker: "E28" },
  { id: "converted", label: "Convertit", icon: TrendingUp, worker: "E29" },
  { id: "rewarded", label: "Recompensat", icon: Gift, worker: "E30-E31" },
];

function consentStatusFromReferralRow(r: ReferralListRow): ConsentStatus {
  if (r.consentGiven && r.consentGivenAt) return "CONFIRMED";
  if (r.status === "PENDING_CONSENT") return "REQUESTED";
  if (r.status === "DECLINED") return "DECLINED";
  return "PENDING";
}

function referralWorkflowFromRow(r: ReferralListRow): ReferralStatus {
  if (r.status === "PENDING_CONSENT") return r.consentGiven ? "CONSENTED" : "CONSENT_PENDING";
  if (r.status === "ACTIVE") return "OUTREACH";
  if (r.status === "CONVERTED") return "CONVERTED";
  if (r.status === "EXPIRED") return "CANCELLED";
  if (r.status === "DECLINED") return "REJECTED";
  return "DETECTED";
}

function mapApiReferralToEntry(r: ReferralListRow): ReferralEntry {
  const consentStatus = consentStatusFromReferralRow(r);
  const referralStatus = referralWorkflowFromRow(r);

  const rewardPaid = r.rewardIssuedAt !== null;
  const rewardAmount = r.rewardValue ? Number(r.rewardValue) : undefined;

  return {
    id: r.id,
    referrerCompany: r.referrerName?.trim() ? r.referrerName : "—",
    referrerCui: r.referrerCui?.trim() ? r.referrerCui : "—",
    prospectCompany: r.referredName?.trim() ? r.referredName : "Prospect neatasat",
    prospectContact: "—",
    consentStatus,
    referralStatus,
    consentRequestedAt: r.createdAt,
    consentConfirmedAt: r.consentGivenAt ?? undefined,
    rewardPaid,
    rewardAmount,
    gdprBasis: r.consentGiven
      ? "Art.6(1)(a) — consimțământ explicit"
      : "Consimțământ în așteptare / status API",
    detectedAt: r.createdAt.slice(0, 10),
  };
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getStepColor(params: {
  readonly isFailed: boolean;
  readonly isCompleted: boolean;
  readonly isActive: boolean;
}): string {
  if (params.isFailed) return "var(--color-er)";
  if (params.isCompleted) return "var(--color-ok)";
  if (params.isActive) return "var(--color-b5)";
  return "var(--color-t4)";
}

function getConsentColor(status: ConsentStatus): string {
  if (status === "DECLINED" || status === "REFUSED") return "var(--color-er)";
  if (status === "CONFIRMED") return "var(--color-ok)";
  return "var(--color-wa)";
}

const STATUS_COLORS: Record<ReferralStatus, string> = {
  DETECTED: "var(--color-t3)",
  CONSENT_PENDING: "var(--color-wa)",
  CONSENTED: "var(--color-in)",
  OUTREACH: "var(--color-b5)",
  CONVERTED: "var(--color-ok)",
  REWARDED: "var(--color-b5)",
  REJECTED: "var(--color-er)",
  CANCELLED: "var(--color-t4)",
};

// ─── Consent Step Item (sub-component to keep ConsentStepper complexity low) ──

interface ConsentStepItemProps {
  readonly step: (typeof CONSENT_STEPS)[number];
  readonly idx: number;
  readonly currentStep: number;
  readonly isTerminated: boolean;
  readonly isLast: boolean;
}

function ConsentStepItem({ step, idx, currentStep, isTerminated, isLast }: ConsentStepItemProps) {
  const isCompleted = !isTerminated && idx < currentStep;
  const isActive = idx === currentStep && !isTerminated;
  const isFailed = isTerminated && idx === currentStep;
  const isSkipped = isTerminated && idx > currentStep;

  const color = getStepColor({ isFailed, isCompleted, isActive });
  const isBright = isCompleted || isActive || isFailed;
  const IconComponent: LucideIcon = step.icon;

  const circleStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: isBright ? `color-mix(in oklch, ${color} 20%, transparent)` : "transparent",
    border: `1.5px solid ${color}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 4px",
    boxShadow:
      isActive || isFailed ? `0 0 8px color-mix(in oklch, ${color} 50%, transparent)` : "none",
    opacity: isSkipped ? 0.35 : 1,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    color,
    fontWeight: isActive ? 700 : 400,
    whiteSpace: "nowrap",
  };

  const workerStyle: React.CSSProperties = {
    fontSize: 8,
    color: "var(--color-t4)",
  };

  const connectorStyle: React.CSSProperties = {
    width: 16,
    height: 1,
    background: isCompleted ? "var(--color-ok)" : "var(--color-s600)",
    marginBottom: 22,
    flexShrink: 0,
  };

  const renderIcon = () => {
    if (isFailed) return <XCircle size={12} color={color} />;
    if (isCompleted) return <CheckCircle2 size={12} color={color} />;
    return <IconComponent size={12} color={color} />;
  };

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ textAlign: "center", minWidth: 60 }}>
        <div style={circleStyle}>{renderIcon()}</div>
        <div style={labelStyle}>{step.label}</div>
        <div style={workerStyle}>{step.worker}</div>
      </div>
      {!isLast && <div style={connectorStyle} />}
    </div>
  );
}

// ─── Consent Stepper ──────────────────────────────────────────────────────────

const STEP_MAP: Record<ReferralStatus, number> = {
  DETECTED: 0,
  CONSENT_PENDING: 1,
  CONSENTED: 2,
  OUTREACH: 3,
  CONVERTED: 4,
  REWARDED: 5,
  REJECTED: 1,
  CANCELLED: 1,
};

function ConsentStepper({ referral }: { readonly referral: ReferralEntry }) {
  const currentStep = STEP_MAP[referral.referralStatus];
  const isTerminated =
    referral.referralStatus === "REJECTED" || referral.referralStatus === "CANCELLED";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        flexWrap: "nowrap",
        overflowX: "auto",
      }}
    >
      {CONSENT_STEPS.map((step, idx) => (
        <ConsentStepItem
          key={step.id}
          step={step}
          idx={idx}
          currentStep={currentStep}
          isTerminated={isTerminated}
          isLast={idx === CONSENT_STEPS.length - 1}
        />
      ))}
    </div>
  );
}

// ─── Referral Funnel ──────────────────────────────────────────────────────────

function ReferralFunnel({ items }: { readonly items: ReferralEntry[] }) {
  const stages = [
    {
      label: "Detectați",
      count: items.length,
      color: "var(--color-neuron-social)",
    },
    {
      label: "Consimțit",
      count: items.filter((r) =>
        ["CONSENTED", "OUTREACH", "CONVERTED", "REWARDED"].includes(r.referralStatus),
      ).length,
      color: "var(--color-b5)",
    },
    {
      label: "Prospectat",
      count: items.filter((r) => ["OUTREACH", "CONVERTED", "REWARDED"].includes(r.referralStatus))
        .length,
      color: "var(--color-wa)",
    },
    {
      label: "Convertit",
      count: items.filter((r) => ["CONVERTED", "REWARDED"].includes(r.referralStatus)).length,
      color: "var(--color-ok)",
    },
    {
      label: "Recompensat",
      count: items.filter((r) => r.rewardPaid).length,
      color: "var(--color-b5)",
    },
  ];

  const maxCount = stages[0].count;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {stages.map((stage) => {
        const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

        const barInnerStyle: React.CSSProperties = {
          height: "100%",
          width: `${pct}%`,
          background: `color-mix(in oklch, ${stage.color} 60%, transparent)`,
          borderRadius: 4,
          transition: "width 0.6s ease",
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
        };

        return (
          <div key={stage.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                minWidth: 90,
                fontSize: 11,
                color: "var(--color-t2)",
                textAlign: "right",
              }}
            >
              {stage.label}
            </div>
            <div
              style={{
                flex: 1,
                height: 28,
                background: "var(--color-s800)",
                borderRadius: 4,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div style={barInnerStyle}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-t1)",
                  }}
                >
                  {stage.count}
                </span>
              </div>
            </div>
            <div
              style={{
                minWidth: 40,
                fontSize: 10,
                color: "var(--color-t3)",
                textAlign: "right",
              }}
            >
              {maxCount > 0 ? `${((stage.count / maxCount) * 100).toFixed(0)}%` : "0%"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ReferralManager() {
  const listQuery = useQuery({
    queryKey: ["etapa5", "referrals", "manager"],
    queryFn: () => fetchReferralsList({ limit: 100, page: 1 }),
  });

  const referrals = useMemo(
    () => (listQuery.data?.data ?? []).map(mapApiReferralToEntry),
    [listQuery.data?.data],
  );

  const [pickedReferralId, setPickedReferralId] = useState<string | null>(null);

  const effectiveReferralId = useMemo(() => {
    if (referrals.length === 0) return null;
    if (pickedReferralId !== null && referrals.some((r) => r.id === pickedReferralId)) {
      return pickedReferralId;
    }
    return referrals[0].id;
  }, [referrals, pickedReferralId]);

  const selected = useMemo(
    () =>
      effectiveReferralId === null
        ? null
        : (referrals.find((r) => r.id === effectiveReferralId) ?? null),
    [referrals, effectiveReferralId],
  );

  const pendingConsent = referrals.filter((r) => r.consentStatus === "REQUESTED").length;
  const converted = referrals.filter((r) =>
    ["CONVERTED", "REWARDED"].includes(r.referralStatus),
  ).length;
  const rewardsPending = referrals.filter((r) => !!r.rewardAmount && !r.rewardPaid).length;
  const totalRewardValue = referrals
    .filter((r) => r.rewardPaid)
    .reduce((s, r) => s + (r.rewardAmount ?? 0), 0);

  function handleRetrimite() {
    if (!selected) return;
    toast.success(
      `Cerere GDPR retrimisă către ${selected.referrerCompany} (CUI: ${selected.referrerCui}).`,
    );
  }

  function handleAnuleaza() {
    if (!selected) return;
    toast.message(
      "Anularea nu apelează PATCH /referrals din UI — folosiți API-ul sau worker-ul E5 pentru actualizare.",
    );
  }

  const rewardSuffix = rewardsPending === 1 ? "ă neprocesată" : "e neprocesate";

  return (
    <PageWrapper title="Referral Manager (GDPR)" actions={<EtapaBadge label="Etapa 5" />}>
      {listQuery.isError && (
        <div className="mb-4 rounded border border-er/40 bg-er/10 px-4 py-3 text-sm text-er">
          Eroare la încărcarea referral-urilor.
        </div>
      )}
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Total Referrals"
          value={String(referrals.length)}
          icon="Users"
          color="var(--color-neuron-social)"
        />
        <KpiCard
          label="Consimțământ Pendent"
          value={String(pendingConsent)}
          icon="AlertTriangle"
          color="var(--color-wa)"
        />
        <KpiCard
          label="Convertiți"
          value={String(converted)}
          icon="TrendingUp"
          color="var(--color-ok)"
        />
        <KpiCard
          label="Recompense Plătite"
          value={`RON ${totalRewardValue}`}
          icon="Gift"
          color="var(--color-b5)"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* GDPR Info Banner */}
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Shield size={14} color="var(--color-neuron-compliance)" />
              <CardTitle>Conformitate GDPR</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                {
                  label: "Baza legală",
                  value: "Art.6(1)(a) — Consimțământ explicit",
                  color: "var(--color-ok)",
                },
                {
                  label: "Drept de retragere",
                  value: "Oricând, fără penalități",
                  color: "var(--color-in)",
                },
                {
                  label: "Retenție date",
                  value: "Max 24 luni de la consimțământ",
                  color: "var(--color-wa)",
                },
                {
                  label: "Outreach fără consent",
                  value: "BLOCAT — E26 verifică OBLIGATORIU",
                  color: "var(--color-er)",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: "var(--color-t3)" }}>{item.label}</span>
                  <span
                    style={{
                      color: item.color,
                      fontWeight: 600,
                      fontSize: 10,
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            {rewardsPending > 0 && (
              <div
                style={{
                  marginTop: 10,
                  padding: "6px 10px",
                  background: "color-mix(in oklch, var(--color-wa) 10%, transparent)",
                  border: "1px solid color-mix(in oklch, var(--color-wa) 30%, transparent)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "var(--color-wa)",
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <AlertTriangle size={12} />
                {rewardsPending} recompens{rewardSuffix}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Funnel */}
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={14} color="var(--color-ok)" />
              <CardTitle>Funnel Conversie</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <ReferralFunnel items={referrals} />
          </CardBody>
        </Card>
      </div>

      {/* Referrals list + detail */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "350px 1fr",
          gap: 16,
        }}
      >
        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-t3)",
              letterSpacing: "0.05em",
            }}
          >
            REFERRALS ({referrals.length})
          </div>
          {referrals.map((r) => {
            const isSelected = effectiveReferralId === r.id;
            const statusColor = STATUS_COLORS[r.referralStatus];
            const statusBadgeStyle: React.CSSProperties = {
              fontSize: 9,
              fontWeight: 700,
              color: statusColor,
              border: `1px solid ${statusColor}`,
              padding: "1px 5px",
              borderRadius: 3,
            };
            const consentColor = getConsentColor(r.consentStatus);

            return (
              <Card
                key={r.id}
                className={cn("cursor-pointer transition-all", isSelected && "border-b5")}
                onClick={() => setPickedReferralId(r.id)}
                style={{
                  borderColor: isSelected ? "var(--color-b5)" : undefined,
                }}
              >
                <CardBody className="py-3 px-4">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-t1)",
                      }}
                    >
                      {r.referrerCompany}
                    </span>
                    <span style={statusBadgeStyle}>{r.referralStatus}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-t3)",
                      marginBottom: 2,
                    }}
                  >
                    <ChevronRight size={10} style={{ display: "inline" }} />
                    {r.prospectCompany}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                    }}
                  >
                    <span style={{ color: consentColor }}>Consent: {r.consentStatus}</span>
                    {!!r.rewardAmount && (
                      <span style={{ color: "var(--color-b5)", fontWeight: 600 }}>
                        RON {r.rewardAmount} {r.rewardPaid ? "✓" : "⏳"}
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Detail */}
        {selected !== null && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Header */}
            <Card>
              <CardBody className="py-4 px-5">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <Building2 size={16} color="var(--color-neuron-social)" />
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--color-t1)",
                        }}
                      >
                        {selected.referrerCompany}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--color-t4)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        CUI: {selected.referrerCui}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-t3)" }}>
                      Recomandă:{" "}
                      <strong style={{ color: "var(--color-t2)" }}>
                        {selected.prospectCompany}
                      </strong>{" "}
                      ({selected.prospectContact})
                    </div>
                  </div>
                  <SBadge status={selected.referralStatus} />
                </div>

                <div
                  style={{
                    padding: "6px 10px",
                    background:
                      "color-mix(in oklch, var(--color-neuron-compliance) 8%, transparent)",
                    border:
                      "1px solid color-mix(in oklch, var(--color-neuron-compliance) 25%, transparent)",
                    borderRadius: 6,
                    fontSize: 10,
                    color: "var(--color-t3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Shield size={11} color="var(--color-neuron-compliance)" />
                  {selected.gdprBasis}
                </div>
              </CardBody>
            </Card>

            {/* GDPR Consent Stepper */}
            <Card>
              <CardHeader>
                <CardTitle>Flow Consimțământ GDPR</CardTitle>
              </CardHeader>
              <CardBody>
                <ConsentStepper referral={selected} />

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 11,
                  }}
                >
                  {!!selected.detectedAt && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <span
                        style={{
                          color: "var(--color-t4)",
                          minWidth: 140,
                        }}
                      >
                        Detectat (E25):
                      </span>
                      <span style={{ color: "var(--color-t2)" }}>{selected.detectedAt}</span>
                    </div>
                  )}
                  {!!selected.consentRequestedAt && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <span
                        style={{
                          color: "var(--color-t4)",
                          minWidth: 140,
                        }}
                      >
                        Consent Cerut (E26):
                      </span>
                      <span style={{ color: "var(--color-t2)" }}>
                        {new Date(selected.consentRequestedAt).toLocaleString("ro-RO")}
                      </span>
                    </div>
                  )}
                  {!!selected.consentConfirmedAt && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <span
                        style={{
                          color: "var(--color-t4)",
                          minWidth: 140,
                        }}
                      >
                        Consent Confirmat (E27):
                      </span>
                      <span style={{ color: "var(--color-ok)" }}>
                        {new Date(selected.consentConfirmedAt).toLocaleString("ro-RO")}
                      </span>
                    </div>
                  )}
                  {!!selected.conversionValue && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <span
                        style={{
                          color: "var(--color-t4)",
                          minWidth: 140,
                        }}
                      >
                        Valoare Conversie (E29):
                      </span>
                      <span style={{ color: "var(--color-ok)", fontWeight: 600 }}>
                        RON {selected.conversionValue.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {!!selected.rewardAmount && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <span
                        style={{
                          color: "var(--color-t4)",
                          minWidth: 140,
                        }}
                      >
                        Recompensă (E30-E31):
                      </span>
                      <span
                        style={{
                          color: selected.rewardPaid ? "var(--color-ok)" : "var(--color-wa)",
                          fontWeight: 600,
                        }}
                      >
                        RON {selected.rewardAmount}{" "}
                        {selected.rewardPaid ? "✓ Plătit" : "⏳ Pending"}
                      </span>
                    </div>
                  )}
                </div>

                {selected.referralStatus === "CONSENT_PENDING" && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      style={{ fontSize: 11, gap: 4 }}
                      onClick={handleRetrimite}
                    >
                      <Clock size={11} />
                      Retrimite Cerere
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      style={{
                        fontSize: 11,
                        gap: 4,
                        color: "var(--color-er)",
                        borderColor: "var(--color-er)",
                      }}
                      onClick={handleAnuleaza}
                    >
                      <XCircle size={11} />
                      Anulează
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
