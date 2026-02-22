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
      className={`p-5 cursor-pointer hover:border-[var(--color-b5)] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_oklch(0_0_0/30%)] transition-all duration-300 border border-[oklch(.22_.018_255/60%)] ${onClick ? "cursor-pointer" : ""}`}
      style={{
        animationDelay: `${delay}ms`,
        animation: "slideIn 0.3s ease backwards",
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-[var(--color-s800)]">
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
