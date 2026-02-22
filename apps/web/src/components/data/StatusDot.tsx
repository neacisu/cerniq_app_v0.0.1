import { cn } from "@/lib/utils.js";

type DotStatus = "ok" | "warning" | "error" | "info" | "neutral";

const dotColors: Record<DotStatus, string> = {
  ok: "bg-[var(--color-ok)]",
  warning: "bg-[var(--color-wa)]",
  error: "bg-[var(--color-er)]",
  info: "bg-[var(--color-in)]",
  neutral: "bg-[var(--color-s600)]",
};

const dotShadows: Record<DotStatus, React.CSSProperties | undefined> = {
  ok: { boxShadow: "0 0 5px oklch(0.60 0.22 148 / 50%)" },
  warning: { boxShadow: "0 0 5px oklch(0.72 0.19 70 / 50%)" },
  error: undefined,
  info: undefined,
  neutral: undefined,
};

export function StatusDot({
  status,
  className,
}: {
  status: DotStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "w-2 h-2 rounded-full shrink-0",
        dotColors[status],
        className,
      )}
      style={dotShadows[status]}
    />
  );
}
