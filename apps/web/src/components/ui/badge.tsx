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

const variantClass: Record<BadgeVariant, string> = {
  bronze: "bbr",
  silver: "bsi",
  gold: "bgo",
  ok: "bok",
  warning: "bwa",
  error: "ber",
  info: "bin",
  neutral: "bnt",
  brand: "bbd",
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

export function Badge({
  variant,
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("badge", variantClass[variant ?? "neutral"], className)}
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
