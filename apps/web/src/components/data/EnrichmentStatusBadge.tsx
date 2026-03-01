import { Badge } from "@/components/ui/badge.js";

export function EnrichmentStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "complete") return <Badge variant="ok">complete</Badge>;
  if (normalized === "in_progress") return <Badge variant="info">in_progress</Badge>;
  if (normalized === "partial") return <Badge variant="warning">partial</Badge>;
  if (normalized === "failed") return <Badge variant="error">failed</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}
