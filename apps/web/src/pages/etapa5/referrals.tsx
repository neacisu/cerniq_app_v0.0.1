import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";

const kpis = [
  { label: "KOLs Active", value: "34", icon: "Users" },
  { label: "Network Reach", value: "12.4K", icon: "Share2" },
  { label: "Referral Revenue", value: "EUR 89K", icon: "TrendingUp" },
];

const kolList = [
  { name: "Ion Popescu", influence: 92 },
  { name: "Maria Ionescu", influence: 78 },
  { name: "Andrei Marin", influence: 65 },
  { name: "Elena Dumitrescu", influence: 54 },
];

const activePoints = [
  { x: 30, y: 25, r: 12 },
  { x: 70, y: 60, r: 18 },
  { x: 45, y: 75, r: 10 },
];
const knnPoints = [
  { x: 55, y: 35 },
  { x: 25, y: 70 },
  { x: 80, y: 20 },
];

export function Referrals() {
  return (
    <PageWrapper title="Referrals KOL" actions={<EtapaBadge label="Etapa 5" />}>
      <div className="grid grid-cols-3 gap-4 mb-6 max-[700px]:grid-cols-1">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} {...k} delay={i * 80} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>KOL List</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {kolList.map((k) => (
                <div
                  key={k.name}
                  className="flex justify-between items-center py-2 border-b border-[var(--color-s700)] last:border-0"
                >
                  <span className="font-medium text-[var(--color-t1)]">{k.name}</span>
                  <span className="text-sm text-[var(--color-b5)]">{k.influence}% influence</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KNN Proximity Map</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="relative h-64 bg-[var(--color-s800)] rounded-[var(--radius-md)]">
              {activePoints.map((p, i) => (
                <div
                  key={`a-${i}`}
                  className="absolute rounded-full bg-[var(--color-b5)] border-2 border-[var(--color-b4)]"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: p.r,
                    height: p.r,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}
              {knnPoints.map((p, i) => (
                <div
                  key={`k-${i}`}
                  className="absolute rounded-full border-2 border-dashed border-[var(--color-s500)] bg-transparent"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: 14,
                    height: 14,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--color-b5)]" /> Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border-2 border-dashed border-[var(--color-s500)]" />{" "}
                KNN candidates
              </span>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
