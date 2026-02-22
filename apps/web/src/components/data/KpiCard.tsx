import * as Icons from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: string;
  color?: string;
  delay?: number;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  change,
  icon,
  color,
  delay = 0,
  onClick,
}: KpiCardProps) {
  const IconComponent =
    (
      Icons as unknown as Record<
        string,
        React.ComponentType<{ size?: number; className?: string }>
      >
    )[icon] ?? Icons.Activity;

  return (
    <div
      className="kc"
      style={{
        animationDelay: `${delay}ms`,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <div className="flex ac jb" style={{ marginBottom: 12 }}>
        <div
          className="kib"
          style={{ background: "oklch(0.70 0.18 72 / 20%)" }}
        >
          <IconComponent size={16} className={color ? "" : "tb"} />
        </div>
        {change && (
          <span
            className={change.startsWith("+") ? "tok" : "ter"}
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            {change}
          </span>
        )}
      </div>
      <div className="sv" style={{ color }}>
        {value}
      </div>
      <div className="sl" style={{ marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}
