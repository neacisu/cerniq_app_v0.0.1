import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { SBadge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { BarChart3, ExternalLink } from "lucide-react";
import {
  fetchCreditProfiles,
  fetchCreditStats,
  type CreditProfileListRow,
} from "@/lib/etapa4-api.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";

function tierColorClass(tier: string): string {
  if (tier === "PREMIUM" || tier === "LOW") return "var(--color-tier-gold)";
  if (tier === "MEDIUM") return "var(--color-tier-silver)";
  if (tier === "HIGH" || tier === "BLOCKED") return "var(--color-tier-bronze)";
  return "var(--color-tier-bronze)";
}

function rowKey(p: CreditProfileListRow): string {
  return p.clientId;
}

export function Credit() {
  const navigate = useNavigate();

  const profilesQuery = useQuery({
    queryKey: ["etapa4", "credit", "profiles", "overview"],
    queryFn: () => fetchCreditProfiles({ limit: 100, page: 1 }),
  });

  const statsQuery = useQuery({
    queryKey: ["etapa4", "credit", "stats"],
    queryFn: () => fetchCreditStats(),
  });

  const rows = useMemo(() => profilesQuery.data?.data ?? [], [profilesQuery.data?.data]);

  const { avgScore, highRisk } = useMemo(() => {
    if (rows.length === 0) return { avgScore: "0", highRisk: 0 };
    const sum = rows.reduce((s, r) => s + r.creditScore, 0);
    const hr = rows.filter((r) => r.riskTier === "HIGH" || r.riskTier === "BLOCKED").length;
    return { avgScore: (sum / rows.length).toFixed(1), highRisk: hr };
  }, [rows]);

  const avgFromStats = statsQuery.data?.data.scoreStats?.avg;
  const displayAvg =
    statsQuery.isSuccess && avgFromStats !== undefined ? Number(avgFromStats).toFixed(1) : avgScore;

  return (
    <PageWrapper title="Credit Scoring — Overview" actions={<EtapaBadge label="Etapa 4" />}>
      {profilesQuery.isError && (
        <div className="mb-4 rounded border border-er/40 bg-er/10 px-4 py-3 text-sm text-er">
          Eroare la încărcarea profilelor credit.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Profile" value={String(rows.length)} icon="Users" color="var(--color-b5)" />
        <KpiCard label="Scor mediu" value={displayAvg} icon="BarChart3" color="var(--color-ok)" />
        <KpiCard
          label="Risc ridicat / blocat"
          value={String(highRisk)}
          icon="AlertTriangle"
          color="var(--color-er)"
        />
      </div>

      <Card>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <CardTitle>Profile credit clienți</CardTitle>
            <Button
              size="sm"
              variant="outline"
              style={{ gap: 5, fontSize: 11 }}
              onClick={() => navigate("/credit/profile")}
            >
              <BarChart3 size={12} /> Radar detaliat
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          {profilesQuery.isSuccess && rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Fără profile"
                description="Nu există încă profile credit pentru acest tenant."
              />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-s700">
                  <th className="px-4 py-3 text-left font-medium text-t3">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-t3">Scor /100</th>
                  <th className="px-4 py-3 text-left font-medium text-t3">Limită</th>
                  <th className="px-4 py-3 text-left font-medium text-t3">Utilizat</th>
                  <th className="px-4 py-3 text-left font-medium text-t3">Risc</th>
                  <th className="px-4 py-3 text-left font-medium text-t3">Tier</th>
                  <th className="px-4 py-3 text-left font-medium text-t3">Profil</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const limit = Number(c.creditLimit);
                  const used = Number(c.creditUsed);
                  const usedPct = limit > 0 ? Math.round((used / limit) * 100) : 0;
                  const tc = tierColorClass(c.riskTier);
                  return (
                    <tr key={rowKey(c)} className="border-b border-s800 hover:bg-s800/50">
                      <td className="px-4 py-3 text-t1 font-medium">
                        {c.companyName?.trim() ? c.companyName : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 w-36">
                          <ProgressBar value={c.creditScore} max={100} />
                          <span className="text-xs text-t3 shrink-0">{c.creditScore}/100</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-t2">
                        RON {limit.toLocaleString("ro-RO")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 w-32">
                          <ProgressBar value={usedPct} max={100} />
                          <span className="text-xs text-t3 shrink-0">{usedPct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <SBadge status={c.riskTier} />
                      </td>
                      <td className="py-3 px-4">
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 3,
                            color: tc,
                            background: `color-mix(in oklch, ${tc} 15%, transparent)`,
                          }}
                        >
                          {c.riskTier}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          style={{ gap: 4, fontSize: 10 }}
                          onClick={() => navigate("/credit/profile")}
                          title="Deschide profil radar detaliat"
                        >
                          <ExternalLink size={11} /> Radar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
