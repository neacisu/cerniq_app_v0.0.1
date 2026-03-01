import { Badge } from "@/components/ui/badge.js";

export function LayerBadge({ layer }: { layer: "bronze" | "silver" | "gold" }) {
  return <Badge variant={layer}>{layer.toUpperCase()}</Badge>;
}
