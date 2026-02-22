import { cn } from "@/lib/utils.js";
import type { ReactNode } from "react";

type BadgeVariant =
  | "bronze"
  | "silver"
  | "gold"
  | "ok"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "brand";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  bronze:
    "bg-[var(--color-tier-bronze)]/20 text-[var(--color-tier-bronze)] border-[var(--color-tier-bronze)]/30",
  silver:
    "bg-[var(--color-tier-silver)]/20 text-[var(--color-tier-silver)] border-[var(--color-tier-silver)]/30",
  gold: "bg-[var(--color-tier-gold)]/20 text-[var(--color-tier-gold)] border-[var(--color-tier-gold)]/30",
  ok: "bg-[var(--color-ok)]/20 text-[var(--color-ok)] border-[var(--color-ok)]/30",
  warning:
    "bg-[var(--color-wa)]/20 text-[var(--color-wa)] border-[var(--color-wa)]/30",
  error:
    "bg-[var(--color-er)]/20 text-[var(--color-er)] border-[var(--color-er)]/30",
  info: "bg-[var(--color-in)]/20 text-[var(--color-in)] border-[var(--color-in)]/30",
  neutral:
    "bg-[var(--color-s700)]/50 text-[var(--color-t2)] border-[var(--color-s600)]",
  brand:
    "bg-[var(--color-b5)]/15 text-[var(--color-b5)] border-[var(--color-b5)]/30",
};

const statusToVariant: Record<string, BadgeVariant> = {
  COMPLETED: "ok",
  ACTIVE: "ok",
  MATCHED: "ok",
  LOYAL: "ok",
  WON: "ok",
  PAID: "ok",
  APPROVED: "ok",
  PROCESSING: "info",
  IN_TRANSIT: "info",
  DISCOVERY: "info",
  CONTACTED_WA: "info",
  CONTACTED_EMAIL: "info",
  PENDING: "warning",
  DRAFT: "warning",
  WARM_REPLY: "warning",
  PROPOSAL: "warning",
  NEW: "warning",
  PAUSED: "warning",
  FAILED: "error",
  BANNED: "error",
  DEAD: "error",
  OVERDUE: "error",
  CHURNED: "error",
  RISK_HIGH: "error",
  OBJECTION_HANDLING: "error",
  RETURNED: "error",
  UNMATCHED: "error",
  OFFLINE: "neutral",
  COLD: "neutral",
  CLOSING: "neutral",
  NEGOTIATION: "brand",
  CONVERTED: "brand",
  SENT: "brand",
  DELIVERED: "brand",
  RISK_LOW: "ok",
  RISK_MED: "warning",
  AT_RISK: "warning",
};

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] text-[0.7rem] font-medium border uppercase tracking-wider",
        variantClasses[variant ?? "neutral"],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const variant = statusToVariant[status] ?? "neutral";
  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
}

export function TBadge({
  tier,
  className,
}: {
  tier: "bronze" | "silver" | "gold";
  className?: string;
}) {
  return (
    <Badge variant={tier} className={className}>
      {tier.toUpperCase()}
    </Badge>
  );
}
