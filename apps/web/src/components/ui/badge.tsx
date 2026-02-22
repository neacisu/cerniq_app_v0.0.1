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
    "bg-[oklch(.18_.04_55/30%)] text-[oklch(.75_.14_58)] border-[oklch(.30_.08_56)]",
  silver:
    "bg-[oklch(.16_.02_255/40%)] text-[oklch(.78_.04_255)] border-[oklch(.32_.03_255)]",
  gold: "bg-[oklch(.19_.07_80/35%)] text-[oklch(.82_.18_82)] border-[oklch(.38_.12_80)]",
  ok: "bg-[oklch(.60_.22_148/14%)] text-[oklch(.72_.22_148)] border-[oklch(.60_.22_148/25%)]",
  warning:
    "bg-[oklch(.72_.19_70/14%)] text-[oklch(.80_.18_72)] border-[oklch(.72_.19_70/25%)]",
  error:
    "bg-[oklch(.58_.24_27/14%)] text-[oklch(.70_.22_28)] border-[oklch(.58_.24_27/25%)]",
  info: "bg-[oklch(.57_.20_245/14%)] text-[oklch(.70_.18_245)] border-[oklch(.57_.20_245/25%)]",
  neutral:
    "bg-[oklch(.20_.015_255)] text-[var(--color-t3)] border-[oklch(.28_.015_255)]",
  brand:
    "bg-[oklch(.70_.18_72/14%)] text-[oklch(.83_.13_76)] border-[oklch(.70_.18_72/30%)]",
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
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-[.04em]",
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
