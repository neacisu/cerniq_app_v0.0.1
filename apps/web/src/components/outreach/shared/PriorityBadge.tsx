import { cn } from "@/lib/utils.js";
import type { ReviewPriority } from "@/lib/etapa2-api.js";

const PRIORITY_CONFIG: Record<
  ReviewPriority,
  { label: string; icon: string; className: string; pulse?: boolean }
> = {
  URGENT: {
    label: "Urgent",
    icon: "🔴",
    className: "bg-red-900/60 text-red-300 border-red-700",
    pulse: true,
  },
  HIGH: {
    label: "Ridicat",
    icon: "🟠",
    className: "bg-orange-900/60 text-orange-300 border-orange-700",
  },
  MEDIUM: {
    label: "Mediu",
    icon: "🟡",
    className: "bg-yellow-900/60 text-yellow-300 border-yellow-700",
  },
  LOW: { label: "Scăzut", icon: "⬇", className: "bg-gray-800 text-gray-400 border-gray-600" },
};

interface PriorityBadgeProps {
  readonly priority: ReviewPriority;
  readonly showIcon?: boolean;
  readonly className?: string;
}

export function PriorityBadge({
  priority,
  showIcon = true,
  className,
}: Readonly<PriorityBadgeProps>) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.MEDIUM;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        config.className,
        config.pulse && "animate-pulse",
        className,
      )}
    >
      {showIcon && <span>{config.icon}</span>}
      {config.label}
    </span>
  );
}
