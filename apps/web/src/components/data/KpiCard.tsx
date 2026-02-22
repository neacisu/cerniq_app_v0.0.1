import { Card } from "@/components/ui/card.js";
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
      Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>
    )[icon] ?? Icons.Activity;

  return (
    <Card
      className={`p-5 cursor-pointer hover:border-[var(--color-b5)] transition-all duration-300 ${onClick ? "cursor-pointer" : ""}`}
      style={{
        animationDelay: `${delay}ms`,
        animation: "fadeUp 0.5s cubic-bezier(.34,1.56,.64,1) backwards",
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-[var(--radius-md)] bg-[var(--color-s800)]">
          <IconComponent size={20} />
        </div>
        {change && (
          <span
            className={`text-xs font-semibold ${change.startsWith("+") ? "tok" : "ter"}`}
          >
            {change}
          </span>
        )}
      </div>
      <div className="sv" style={{ color }}>
        {value}
      </div>
      <div className="sl mt-1">{label}</div>
    </Card>
  );
}
