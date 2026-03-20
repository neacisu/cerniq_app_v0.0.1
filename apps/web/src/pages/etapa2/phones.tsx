import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody } from "@/components/ui/index.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { useOutreachPhones, usePhoneHealthCheck } from "@/hooks/use-etapa2.js";
import type { PhoneStatus } from "@/lib/etapa2-api.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils.js";

function quotaBarColorClass(quotaPercentage: number, isEnabled: boolean): string {
  const pct = quotaPercentage;
  if (pct >= 100 || !isEnabled) {
    return "bg-red-500";
  }
  if (pct >= 90) {
    return "bg-amber-400";
  }
  return "bg-green-500";
}

const PHONES_GRID_SKELETON_KEYS = [
  "phones-sk-01",
  "phones-sk-02",
  "phones-sk-03",
  "phones-sk-04",
  "phones-sk-05",
  "phones-sk-06",
  "phones-sk-07",
  "phones-sk-08",
  "phones-sk-09",
  "phones-sk-10",
] as const;

const STATUS_CONFIG: Record<PhoneStatus, { label: string; color: string; dot: string }> = {
  ACTIVE: { label: "Activ", color: "text-green-400", dot: "bg-green-400" },
  PAUSED: { label: "Pauzat", color: "text-yellow-400", dot: "bg-yellow-400" },
  OFFLINE: { label: "Offline", color: "text-gray-400", dot: "bg-gray-400" },
  BANNED: { label: "Banat", color: "text-red-500", dot: "bg-red-500" },
  RECONNECTING: { label: "Reconectare", color: "text-blue-400", dot: "bg-blue-400 animate-pulse" },
};

export function Phones() {
  const { data, isLoading } = useOutreachPhones();
  const { mutateAsync: healthCheck } = usePhoneHealthCheck();

  const phones = data?.data ?? [];
  const active = phones.filter((p) => p.status === "ACTIVE").length;
  const avgQuota =
    phones.length > 0
      ? Math.round(phones.reduce((s, p) => s + (p.quotaPercentage ?? 0), 0) / phones.length)
      : 0;
  const errors = phones.filter((p) => p.status === "BANNED" || p.status === "OFFLINE").length;

  const kpis = [
    { label: "Active", value: String(active), icon: "Phone" },
    { label: "Quota Medie", value: `${avgQuota}%`, icon: "BarChart2" },
    { label: "Probleme", value: String(errors), icon: "AlertCircle" },
  ];

  return (
    <PageWrapper title="Phones WhatsApp">
      <div className="grid grid-cols-3 gap-4 mb-6 max-[700px]:grid-cols-1">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} {...k} delay={i * 80} />
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-5 gap-4 max-[900px]:grid-cols-2">
          {PHONES_GRID_SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4 max-[900px]:grid-cols-2">
          {phones.map((phone) => {
            const cfg = STATUS_CONFIG[phone.status] ?? STATUS_CONFIG.OFFLINE;
            const pct = phone.quotaPercentage ?? 0;
            const barColor = quotaBarColorClass(pct, phone.isEnabled);

            return (
              <Card
                key={phone.id}
                className={cn(
                  "cursor-pointer hover:border-b5 transition-colors",
                  !phone.isEnabled && "opacity-60",
                )}
                onClick={async () => {
                  try {
                    await healthCheck(phone.id);
                    toast.success(`Health check declanșat: ${phone.label}`);
                  } catch {
                    toast.error("Eroare health check");
                  }
                }}
              >
                <CardBody className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-t1 truncate max-w-[80px]">
                      {phone.label}
                    </span>
                    <span className={cn("flex h-2 w-2 rounded-full", cfg.dot)} title={cfg.label} />
                  </div>
                  <p className="mb-1 truncate text-xs text-t3">{phone.phoneNumber}</p>
                  <p className={`text-xs font-medium mb-2 ${cfg.color}`}>{cfg.label}</p>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-s600">
                    <div
                      className={cn("h-full rounded-full transition-all", barColor)}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-t3 text-right">
                    {phone.currentUsage ?? 0}/{phone.dailyQuotaLimit}
                  </p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
