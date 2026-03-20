import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge.js";

function formatRemaining(ms: number): string {
  if (ms <= 0) {
    const overMs = Math.abs(ms);
    const overH = Math.floor(overMs / (1000 * 60 * 60));
    const overM = Math.floor((overMs % (1000 * 60 * 60)) / (1000 * 60));
    if (overH > 0) return `Depășit cu ${overH}h ${overM}m`;
    return `Depășit cu ${overM}m`;
  }
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (h > 0) return `${h}h ${m}m rămase`;
  return `${m}m rămase`;
}

export function SLACountdown({ dueAt }: { readonly dueAt: string | Date }) {
  const dueMs = new Date(dueAt).getTime();
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (Number.isNaN(dueMs)) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => clearInterval(interval);
  }, [dueMs]);

  if (Number.isNaN(dueMs)) {
    return <Badge variant="neutral">SLA necunoscut</Badge>;
  }

  const remaining = dueMs - now;

  if (remaining <= 0) {
    return <Badge variant="error">{formatRemaining(remaining)}</Badge>;
  }
  if (remaining < 2 * 60 * 60 * 1000) {
    return <Badge variant="warning">{formatRemaining(remaining)}</Badge>;
  }
  return <Badge variant="info">{formatRemaining(remaining)}</Badge>;
}
