import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { SBadge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { BarChart3, ExternalLink } from "lucide-react";

const MOCK_CREDIT = [
  {
    company: "SC AgroSud SRL",
    cui: "12345678",
    score: 8.2,
    limit: "RON 230K",
    used: "RON 106K",
    usedPct: 46,
    risk: "RISK_LOW",
    tier: "GOLD",
  },
  {
    company: "Cooperativa Agriland",
    cui: "87654321",
    score: 5.1,
    limit: "RON 90K",
    used: "RON 81K",
    usedPct: 90,
    risk: "RISK_MED",
    tier: "SILVER",
  },
  {
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    score: 3.4,
    limit: "RON 46K",
    used: "RON 41K",
    usedPct: 89,
    risk: "RISK_HIGH",
    tier: "BRONZE",
  },
  {
    company: "SC Ferma Dunărea SA",
    cui: "99887766",
    score: 9,
    limit: "RON 460K",
    used: "RON 207K",
    usedPct: 45,
    risk: "RISK_LOW",
    tier: "GOLD",
  },
];

export function Credit() {
  const navigate = useNavigate();

  const avgScore = (MOCK_CREDIT.reduce((s, c) => s + c.score, 0) / MOCK_CREDIT.length).toFixed(1);
  const highRisk = MOCK_CREDIT.filter((c) => c.risk === "RISK_HIGH").length;

  return (
    <PageWrapper title="Credit Scoring — Overview" actions={<EtapaBadge label="Etapa 4" />}>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Profile"
          value={String(MOCK_CREDIT.length)}
          icon="Users"
          color="var(--color-b5)"
        />
        <KpiCard label="Scor Mediu" value={avgScore} icon="BarChart3" color="var(--color-ok)" />
        <KpiCard
          label="Risc Ridicat"
          value={String(highRisk)}
          icon="AlertTriangle"
          color="var(--color-er)"
        />
      </div>

      <Card>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <CardTitle>Profile Credit Clienți</CardTitle>
            <Button
              size="sm"
              variant="outline"
              style={{ gap: 5, fontSize: 11 }}
              onClick={() => navigate("/credit/profile")}
            >
              <BarChart3 size={12} /> Radar Charts Detaliate
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700">
                <th className="px-4 py-3 text-left font-medium text-t3">Client</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Scor/10</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Limită Credit</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Utilizat</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Risc</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Tier</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Profil</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CREDIT.map((c) => (
                <tr key={c.company} className="border-b border-s800 hover:bg-s800/50">
                  <td className="px-4 py-3 text-t1 font-medium">{c.company}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 w-36">
                      <ProgressBar value={c.score * 10} max={100} />
                      <span className="text-xs text-t3 shrink-0">{c.score}/10</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-t2">{c.limit}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 w-32">
                      <ProgressBar value={c.usedPct} max={100} />
                      <span className="text-xs text-t3 shrink-0">{c.usedPct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <SBadge status={c.risk} />
                  </td>
                  <td className="py-3 px-4">
                    {(() => {
                      let tierColor = "var(--color-tier-bronze)";
                      if (c.tier === "GOLD") tierColor = "var(--color-tier-gold)";
                      else if (c.tier === "SILVER") tierColor = "var(--color-tier-silver)";
                      return (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 3,
                            color: tierColor,
                            background: `color-mix(in oklch, ${tierColor} 15%, transparent)`,
                          }}
                        >
                          {c.tier}
                        </span>
                      );
                    })()}
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
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
