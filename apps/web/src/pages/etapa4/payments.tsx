import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { Badge, SBadge } from "@/components/ui/index.js";
import { cn } from "@/lib/utils.js";

const MOCK_PAYMENTS = [
  {
    date: "2025-02-20",
    company: "SC AgroSud SRL",
    amount: 23000,
    type: "PAYMENT",
    status: "MATCHED",
    currency: "EUR",
  },
  {
    date: "2025-02-19",
    company: "Cooperativa Agriland",
    amount: -500,
    type: "REFUND",
    status: "MATCHED",
    currency: "EUR",
  },
  {
    date: "2025-02-18",
    company: "OUAI Ialomita Nord",
    amount: 8000,
    type: "PAYMENT",
    status: "UNMATCHED",
    currency: "EUR",
  },
  {
    date: "2025-02-17",
    company: "SC Ferma Dunarea SA",
    amount: 45000,
    type: "PAYMENT",
    status: "MATCHED",
    currency: "EUR",
  },
];

export function Payments() {
  return (
    <PageWrapper title="Payments Revolut">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Total" value="EUR 234K" icon="Wallet" color="var(--color-b5)" />
        <KpiCard label="Matched" value="89%" icon="CheckCircle" color="var(--color-ok)" />
        <KpiCard label="Pending" value="23" icon="Clock" color="var(--color-wa)" />
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-s700)]">
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">Date</th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">Company</th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">Amount</th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">Type</th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">Status</th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">Currency</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PAYMENTS.map((p, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-[var(--color-s800)] hover:bg-[var(--color-s800)]/50",
                    p.status === "UNMATCHED" && "bg-[var(--color-wa)]/10",
                  )}
                >
                  <td className="py-3 px-4 text-[var(--color-t3)]">{p.date}</td>
                  <td className="py-3 px-4 text-[var(--color-t1)]">{p.company}</td>
                  <td
                    className={cn(
                      "py-3 px-4 font-medium",
                      p.amount >= 0 ? "text-[var(--color-ok)]" : "text-[var(--color-er)]",
                    )}
                  >
                    {p.amount >= 0 ? "+" : ""}
                    {p.amount.toLocaleString()} EUR
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={p.type === "REFUND" ? "warning" : "brand"}>{p.type}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <SBadge status={p.status} />
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="neutral">{p.currency}</Badge>
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
