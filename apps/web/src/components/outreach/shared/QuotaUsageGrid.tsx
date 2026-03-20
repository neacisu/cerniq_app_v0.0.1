import { cn } from "@/lib/utils.js";
import type { WaPhone } from "@/lib/etapa2-api.js";

interface QuotaUsageGridProps {
  readonly phones: readonly WaPhone[];
}

function getQuotaColor(pct: number, status: string): string {
  if (status !== "ACTIVE") return "text-red-400";
  if (pct >= 100) return "text-red-400";
  if (pct >= 90) return "text-amber-400";
  return "text-green-400";
}

function getProgressColor(pct: number, status: string): string {
  if (status !== "ACTIVE") return "bg-red-500";
  if (pct >= 100) return "bg-red-500";
  if (pct >= 90) return "bg-amber-500";
  return "bg-green-500";
}

export function QuotaUsageGrid({ phones }: Readonly<QuotaUsageGridProps>) {
  return (
    <div className="grid grid-cols-5 gap-2 max-[700px]:grid-cols-2">
      {phones.map((phone) => {
        const pct = phone.quotaPercentage ?? 0;
        const colorClass = getQuotaColor(pct, phone.status);
        const progressColor = getProgressColor(pct, phone.status);

        return (
          <div
            key={phone.id}
            className={cn(
              "rounded-lg border p-2 space-y-1",
              phone.status === "ACTIVE" ? "border-s700 bg-s800" : "border-red-700/50 bg-red-900/10",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-t2 truncate">{phone.label}</span>
              <span className={cn("text-[10px] font-bold", colorClass)}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-s700 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", progressColor)}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-t3 truncate">
              {phone.currentUsage ?? 0}/{phone.dailyQuotaLimit}
            </p>
          </div>
        );
      })}
    </div>
  );
}
