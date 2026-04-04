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
  ONBOARDING: "warning",
  NURTURING_ACTIVE: "ok",
  LOYAL_CLIENT: "ok",
  ADVOCATE: "brand",
  REACTIVATED: "info",
  NOT_SENT: "neutral",
  SENDING: "info",
  VALIDATED: "ok",
  REJECTED: "error",
  ERROR: "error",
  CREDIT_NOTE: "warning",
};

type BadgeProps = Readonly<{
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}>;

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn("badge", variantClass[variant ?? "neutral"], className)}>{children}</span>
  );
}

type SBadgeProps = Readonly<{ status: string; className?: string }>;

export function SBadge({ status, className }: SBadgeProps) {
  const variant = statusToVariant[status] ?? "neutral";
  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
}

type TBadgeProps = Readonly<{
  tier: "bronze" | "silver" | "gold";
  className?: string;
}>;

export function TBadge({ tier, className }: TBadgeProps) {
  return (
    <Badge variant={tier} className={className}>
      {tier.toUpperCase()}
    </Badge>
  );
}
