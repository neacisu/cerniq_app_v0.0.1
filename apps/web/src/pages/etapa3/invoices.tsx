import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { Badge, SBadge } from "@/components/ui/index.js";
import { cn } from "@/lib/utils.js";

const MOCK_INVOICES = [
  {
    nr: "FV-2025-001",
    company: "SC AgroSud SRL",
    amount: "EUR 23K",
    vat: "EUR 4.5K",
    status: "PAID",
    spv: "ok",
    date: "2025-02-15",
    overdue: false,
  },
  {
    nr: "FV-2025-002",
    company: "Cooperativa Agriland",
    amount: "EUR 12K",
    vat: "EUR 2.3K",
    status: "PENDING",
    spv: "pending",
    date: "2025-02-18",
    overdue: true,
  },
  {
    nr: "FV-2025-003",
    company: "OUAI Ialomita Nord",
    amount: "EUR 8K",
    vat: "EUR 1.5K",
    status: "PAID",
    spv: "ok",
    date: "2025-02-10",
    overdue: false,
  },
  {
    nr: "FV-2025-004",
    company: "SC Ferma Dunarea SA",
    amount: "EUR 45K",
    vat: "EUR 8.7K",
    status: "OVERDUE",
    spv: "pending",
    date: "2025-01-20",
    overdue: true,
  },
];

export function Invoices() {
  return (
    <PageWrapper title="e-Factura SPV ANAF">
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard label="Total" value="234" icon="FileText" color="var(--color-b5)" />
        <KpiCard label="Paid" value="189" icon="CheckCircle" color="var(--color-ok)" />
        <KpiCard label="Overdue" value="12" icon="AlertCircle" color="var(--color-er)" />
        <KpiCard
          label="TVA Colectat"
          value="EUR 44K"
          icon="Receipt"
          color="var(--color-tier-silver)"
        />
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700">
                <th className="px-4 py-3 text-left font-medium text-t3">Nr</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Company</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-t3">TVA 24%</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Status</th>
                <th className="px-4 py-3 text-left font-medium text-t3">SPV</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Date</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((inv) => (
                <tr
                  key={inv.nr}
                  className={cn("border-b border-s800 hover:bg-s800/50", inv.overdue && "bg-er/10")}
                >
                  <td className="px-4 py-3 text-t2">{inv.nr}</td>
                  <td className="px-4 py-3 text-t1">{inv.company}</td>
                  <td className="py-3 px-4">{inv.amount}</td>
                  <td className="py-3 px-4">{inv.vat}</td>
                  <td className="py-3 px-4">
                    <SBadge status={inv.status} />
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={inv.spv === "ok" ? "ok" : "warning"}>{inv.spv}</Badge>
                  </td>
                  <td className="px-4 py-3 text-t3">{inv.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
