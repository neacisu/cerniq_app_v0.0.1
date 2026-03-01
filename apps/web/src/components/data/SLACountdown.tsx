import { Badge } from "@/components/ui/badge.js";

export function SLACountdown({ dueAt }: { dueAt: string | Date }) {
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) {
    return <Badge variant="neutral">SLA necunoscut</Badge>;
  }
  return <Badge variant="info">{parsed.toLocaleString("ro-RO")}</Badge>;
}
