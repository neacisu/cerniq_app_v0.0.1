import { KpiCard } from "@/components/data/KpiCard.js";

type StatsGridItem = {
  label: string;
  value: string;
  change?: string;
  icon?: string;
  color?: string;
  path?: string;
};

type StatsGridProps = {
  items: StatsGridItem[];
  onNavigate?: (path: string) => void;
};

export function StatsGrid({ items, onNavigate }: StatsGridProps) {
  return (
    <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[700px]:grid-cols-1">
      {items.map((item, index) => (
        <KpiCard
          key={item.label}
          {...item}
          change={item.change ?? ""}
          icon={item.icon ?? "BarChart3"}
          color={item.color ?? "var(--color-b5)"}
          delay={index * 100}
          onClick={item.path && onNavigate ? () => onNavigate(item.path as string) : undefined}
        />
      ))}
    </div>
  );
}
