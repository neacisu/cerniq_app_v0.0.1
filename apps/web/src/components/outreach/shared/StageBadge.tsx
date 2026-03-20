import { cn } from "@/lib/utils";
import type { LeadState } from "@/lib/etapa2-api";
import { STAGE_CONFIG } from "./stage-config.js";

const SIZE_CLASSES = {
  sm: "text-xs px-1.5 py-0.5",
  default: "text-xs px-2 py-1",
  lg: "text-sm px-3 py-1.5",
};

interface StageBadgeProps {
  readonly stage: LeadState;
  readonly size?: "sm" | "default" | "lg";
  readonly showIcon?: boolean;
  readonly className?: string;
}

export function StageBadge({
  stage,
  size = "default",
  showIcon = true,
  className,
}: Readonly<StageBadgeProps>) {
  const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG.COLD;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium",
        SIZE_CLASSES[size],
        config.className,
        className,
      )}
    >
      {showIcon && <span className="text-[10px]">{config.icon}</span>}
      {config.label}
    </span>
  );
}
