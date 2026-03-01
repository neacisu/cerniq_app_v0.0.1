import { cn } from "@/lib/utils.js";

type DotStatus = "ok" | "warning" | "error" | "info" | "neutral";

const dotClass: Record<DotStatus, string> = {
  ok: "dok",
  warning: "dwa",
  error: "der",
  info: "din",
  neutral: "dnt",
};

export function StatusDot({ status, className }: { status: DotStatus; className?: string }) {
  return <span className={cn("dot", dotClass[status], className)} />;
}
