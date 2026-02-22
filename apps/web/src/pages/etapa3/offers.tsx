import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Button } from "@/components/ui/index.js";
import { SBadge } from "@/components/ui/index.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { FileText, Send } from "lucide-react";

const MOCK_OFFERS = [
  {
    id: "OF-001",
    company: "SC AgroSud SRL",
    amount: "EUR 23K",
    status: "SENT",
    date: "2025-02-20",
  },
  {
    id: "OF-002",
    company: "Cooperativa Agriland",
    amount: "EUR 12K",
    status: "DRAFT",
    date: "2025-02-19",
  },
  {
    id: "OF-003",
    company: "OUAI Ialomita Nord",
    amount: "EUR 8K",
    status: "DELIVERED",
    date: "2025-02-18",
  },
  {
    id: "OF-004",
    company: "SC Ferma Dunarea SA",
    amount: "EUR 45K",
    status: "PAID",
    date: "2025-02-15",
  },
  {
    id: "OF-005",
    company: "SC AgroTech",
    amount: "EUR 15K",
    status: "SENT",
    date: "2025-02-17",
  },
];

export function Offers() {
  return (
    <PageWrapper title="Offers">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Total Offers"
          value="45"
          icon="FileText"
          color="var(--color-b5)"
        />
        <KpiCard label="Sent" value="32" icon="Send" color="var(--color-in)" />
        <KpiCard
          label="Paid"
          value="12"
          icon="CheckCircle"
          color="var(--color-ok)"
        />
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-s700)]">
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">
                  ID
                </th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">
                  Company
                </th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">
                  Amount
                </th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_OFFERS.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-[var(--color-s800)] hover:bg-[var(--color-s800)]/50"
                >
                  <td className="py-3 px-4 text-[var(--color-t2)]">{o.id}</td>
                  <td className="py-3 px-4 text-[var(--color-t1)]">
                    {o.company}
                  </td>
                  <td className="py-3 px-4">{o.amount}</td>
                  <td className="py-3 px-4">
                    <SBadge status={o.status} />
                  </td>
                  <td className="py-3 px-4 text-[var(--color-t3)]">{o.date}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon">
                        <FileText size={16} />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Send size={16} />
                      </Button>
                    </div>
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
