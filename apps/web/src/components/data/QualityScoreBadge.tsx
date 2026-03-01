import { Badge } from "@/components/ui/badge.js";

export function QualityScoreBadge({ value }: { value: number }) {
  if (value >= 80) return <Badge variant="ok">{value}%</Badge>;
  if (value >= 60) return <Badge variant="warning">{value}%</Badge>;
  return <Badge variant="error">{value}%</Badge>;
}
