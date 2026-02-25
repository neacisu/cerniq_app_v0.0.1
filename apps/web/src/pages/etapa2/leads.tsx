import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody, Badge, SBadge } from "@/components/ui/index.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { MOCK_LEADS } from "@/config/constants.js";
import { cn } from "@/lib/utils.js";

const TABS = ["ALL", "COLD", "CONTACTED", "WARM", "NEGOTIATION", "CONVERTED"];

function matchTab(status: string, tab: string): boolean {
  if (tab === "ALL") return true;
  const u = status.toUpperCase();
  if (tab === "COLD") return u === "COLD";
  if (tab === "CONTACTED") return u.includes("CONTACTED");
  if (tab === "WARM") return u.includes("WARM");
  if (tab === "NEGOTIATION") return u === "NEGOTIATION";
  if (tab === "CONVERTED") return u === "CONVERTED";
  return false;
}

export function Leads() {
  const [tab, setTab] = useState("ALL");
  const filteredLeads = MOCK_LEADS.filter((l) => matchTab(l.status, tab));

  return (
    <PageWrapper title="Leads">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium whitespace-nowrap",
              tab === t
                ? "bg-[var(--color-b5)] text-[var(--color-s950)]"
                : "bg-[var(--color-s800)] text-[var(--color-t2)] hover:bg-[var(--color-s700)]",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Management</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-s700)] text-left text-[var(--color-t3)]">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Sentiment</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-[var(--color-s700)] last:border-0 hover:bg-[var(--color-s800)]/50"
                >
                  <td className="px-5 py-3 font-medium text-[var(--color-t1)]">{l.company}</td>
                  <td className="px-5 py-3 text-[var(--color-t2)]">{l.contact}</td>
                  <td className="px-5 py-3">
                    <SBadge status={l.status} />
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="neutral">{l.channel}</Badge>
                  </td>
                  <td className="px-5 py-3 w-24">
                    <ProgressBar value={l.sentiment * 100} />
                  </td>
                  <td className="px-5 py-3">{l.score}</td>
                  <td className="px-5 py-3 text-[var(--color-t3)]">{l.timeAgo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
