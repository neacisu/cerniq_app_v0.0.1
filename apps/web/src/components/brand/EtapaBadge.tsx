import { cn } from "@/lib/utils.js";

type EtapaType = "brand" | "info" | "ok";

const typeStyles: Record<EtapaType, string> = {
  brand:
    "bg-[var(--color-b5)]/15 text-[var(--color-b5)] border-[var(--color-b5)]/30",
  info: "bg-[var(--color-in)]/15 text-[var(--color-in)] border-[var(--color-in)]/30",
  ok: "bg-[var(--color-ok)]/15 text-[var(--color-ok)] border-[var(--color-ok)]/30",
};

export function EtapaBadge({
  label,
  type = "brand",
  className,
}: {
  label: string;
  type?: EtapaType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium border",
        typeStyles[type],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function EtapaBanner({
  title,
  description,
  type = "brand",
  className,
}: {
  title: string;
  description?: string;
  type?: EtapaType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-[var(--radius-md)] border",
        typeStyles[type],
        className,
      )}
    >
      <div className="font-semibold text-sm">{title}</div>
      {description && (
        <div className="text-xs mt-1 opacity-80">{description}</div>
      )}
    </div>
  );
}
