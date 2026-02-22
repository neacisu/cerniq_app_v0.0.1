import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { SBadge } from "@/components/ui/badge.js";

const MOCK_CREDIT = [
  {
    company: "SC AgroSud SRL",
    score: 8.2,
    limit: "EUR 50K",
    used: "EUR 23K",
    risk: "RISK_LOW",
  },
  {
    company: "Cooperativa Agriland",
    score: 5.1,
    limit: "EUR 20K",
    used: "EUR 18K",
    risk: "RISK_MED",
  },
  {
    company: "OUAI Ialomita Nord",
    score: 3.4,
    limit: "EUR 10K",
    used: "EUR 9K",
    risk: "RISK_HIGH",
  },
  {
    company: "SC Ferma Dunarea SA",
    score: 9.0,
    limit: "EUR 100K",
    used: "EUR 45K",
    risk: "RISK_LOW",
  },
];

export function Credit() {
  return (
    <PageWrapper title="Credit Scoring (Termene.ro)">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Profiles"
          value="234"
          icon="Users"
          color="var(--color-b5)"
        />
        <KpiCard
          label="Avg Score"
          value="7.2"
          icon="BarChart3"
          color="var(--color-ok)"
        />
        <KpiCard
          label="Risk Alerts"
          value="8"
          icon="AlertTriangle"
          color="var(--color-er)"
        />
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-s700)]">
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">
                  Company
                </th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">
                  Score
                </th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">
                  Credit Limit
                </th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">
                  Used
                </th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">
                  Risk
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CREDIT.map((c) => (
                <tr
                  key={c.company}
                  className="border-b border-[var(--color-s800)] hover:bg-[var(--color-s800)]/50"
                >
                  <td className="py-3 px-4 text-[var(--color-t1)]">
                    {c.company}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 w-32">
                      <ProgressBar
                        value={c.score * 10}
                        max={100}
                        color="auto"
                        className="flex-1"
                      />
                      <span className="text-xs text-[var(--color-t3)]">
                        {c.score}/10
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{c.limit}</td>
                  <td className="py-3 px-4">{c.used}</td>
                  <td className="py-3 px-4">
                    <SBadge status={c.risk} />
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
