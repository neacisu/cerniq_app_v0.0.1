import { cn } from "@/lib/utils.js";

type EtapaType = "brand" | "info" | "ok";

const typeStyles: Record<EtapaType, { badge: string; banner: string }> = {
  brand: {
    badge:
      "bg-[var(--color-b5)]/15 text-[var(--color-b5)] border-[var(--color-b5)]/30",
    banner:
      "bg-[oklch(.70_.18_72/6%)] border-[oklch(.70_.18_72/22%)] border-l-[var(--color-b5)]",
  },
  info: {
    badge:
      "bg-[var(--color-in)]/15 text-[var(--color-in)] border-[var(--color-in)]/30",
    banner:
      "bg-[oklch(.57_.20_245/5%)] border-[oklch(.57_.20_245/20%)] border-l-[var(--color-in)]",
  },
  ok: {
    badge:
      "bg-[var(--color-ok)]/15 text-[var(--color-ok)] border-[var(--color-ok)]/30",
    banner:
      "bg-[oklch(.60_.22_148/5%)] border-[oklch(.60_.22_148/20%)] border-l-[var(--color-ok)]",
  },
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
        typeStyles[type].badge,
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
        "flex items-center gap-[14px] p-3 px-4 border border-l-[3px] rounded-[10px] mb-[22px]",
        typeStyles[type].banner,
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
