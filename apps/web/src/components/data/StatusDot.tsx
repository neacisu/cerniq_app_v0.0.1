import { cn } from "@/lib/utils.js";

type DotStatus = "ok" | "warning" | "error" | "info" | "neutral";

const dotColors: Record<DotStatus, string> = {
  ok: "bg-[var(--color-ok)]",
  warning: "bg-[var(--color-wa)]",
  error: "bg-[var(--color-er)]",
  info: "bg-[var(--color-in)]",
  neutral: "bg-[var(--color-s600)]",
};

const glowColors: Record<DotStatus, string> = {
  ok: "shadow-[0_0_6px_var(--color-ok)]",
  warning: "shadow-[0_0_6px_var(--color-wa)]",
  error: "shadow-[0_0_6px_var(--color-er)]",
  info: "shadow-[0_0_6px_var(--color-in)]",
  neutral: "",
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
        "inline-block w-2 h-2 rounded-full",
        dotColors[status],
        glowColors[status],
        className,
      )}
    />
  );
}
