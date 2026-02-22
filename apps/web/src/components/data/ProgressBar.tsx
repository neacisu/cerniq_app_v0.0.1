import { cn } from "@/lib/utils.js";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: "ok" | "warning" | "error" | "brand" | "auto";
}

function getAutoColor(pct: number): string {
  if (pct >= 70) return "var(--color-ok)";
  if (pct >= 40) return "var(--color-wa)";
  return "var(--color-er)";
}

export function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = false,
  color = "auto",
}: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor =
    color === "auto"
      ? getAutoColor(pct)
      : color === "ok"
        ? "var(--color-ok)"
        : color === "warning"
          ? "var(--color-wa)"
          : color === "error"
            ? "var(--color-er)"
            : "var(--color-b5)";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-[6px] bg-[oklch(.20_.018_256)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(.4,0,.2,1)]"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-[var(--color-t3)] min-w-[2.5rem] text-right">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
