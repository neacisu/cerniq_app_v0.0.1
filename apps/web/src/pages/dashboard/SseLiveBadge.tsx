import type { ReactNode } from "react";

const DEFAULT_LABEL = "KPI Etapa 1 — flux live (SSE)";

export function SseLiveBadge({ label = DEFAULT_LABEL }: Readonly<{ label?: string }>): ReactNode {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/40 bg-ok/10 px-2 py-0.5 text-ok">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
      </span>
      <span className="whitespace-nowrap leading-tight">{label}</span>
    </span>
  );
}
