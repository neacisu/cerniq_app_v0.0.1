import { cn } from "@/lib/utils.js";

type EtapaType = "brand" | "info" | "ok";

export function EtapaBadge({
  label,
  type = "brand",
  className,
}: {
  label: string;
  type?: EtapaType;
  className?: string;
}) {
  const badgeVariant: Record<EtapaType, string> = {
    brand: "bbd",
    info: "bin",
    ok: "bok",
  };
  return (
    <span className={cn("badge", badgeVariant[type], className)}>{label}</span>
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
    <div className={cn("eb", type !== "brand" ? type : "", className)}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
      {description && (
        <div className="t3" style={{ fontSize: 12 }}>
          {description}
        </div>
      )}
    </div>
  );
}
