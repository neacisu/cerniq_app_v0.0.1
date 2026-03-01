import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { SBadge } from "@/components/ui/badge.js";
import { Badge } from "@/components/ui/index.js";
import { toast } from "sonner";

const MOCK_AWBS = [
  {
    awb: "SDY-123456789",
    company: "SC AgroSud SRL",
    parcels: 2,
    county: "București",
    eta: "2025-02-21",
    cod: "EUR 450",
    status: "IN_TRANSIT",
  },
  {
    awb: "SDY-987654321",
    company: "Cooperativa Agriland",
    parcels: 1,
    county: "Iași",
    eta: "2025-02-22",
    cod: "-",
    status: "PROCESSING",
  },
  {
    awb: "SDY-555666777",
    company: "OUAI Ialomita Nord",
    parcels: 3,
    county: "Constanța",
    eta: "2025-02-20",
    cod: "EUR 890",
    status: "IN_TRANSIT",
  },
];

export function Logistics() {
  const handleAwbClick = (awb: string) => toast.info(`AWB: ${awb}`);

  return (
    <PageWrapper title="Logistics AWB (Sameday)">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="AWBs Active" value="156" icon="Package" color="var(--color-b5)" />
        <KpiCard label="In Transit" value="89" icon="Truck" color="var(--color-in)" />
        <KpiCard label="COD Pending" value="EUR 34K" icon="Wallet" color="var(--color-wa)" />
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-s700)]">
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">AWB Nr</th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">Company</th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">Parcels</th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">County</th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">ETA</th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">COD</th>
                <th className="text-left py-3 px-4 text-[var(--color-t3)] font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_AWBS.map((a) => (
                <tr
                  key={a.awb}
                  className="border-b border-[var(--color-s800)] hover:bg-[var(--color-s800)]/50"
                >
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleAwbClick(a.awb)}
                      className="text-[var(--color-b5)] hover:underline cursor-pointer"
                    >
                      {a.awb}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-[var(--color-t1)]">{a.company}</td>
                  <td className="py-3 px-4">{a.parcels}</td>
                  <td className="py-3 px-4">{a.county}</td>
                  <td className="py-3 px-4 text-[var(--color-t3)]">{a.eta}</td>
                  <td className="py-3 px-4">
                    <Badge variant={a.cod === "-" ? "neutral" : "warning"}>{a.cod}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <SBadge status={a.status} />
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
