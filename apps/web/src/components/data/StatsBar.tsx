interface StatsBarItem {
  label: string;
  value: number;
  color?: string;
}

export function StatsBar({
  items,
  className,
}: {
  items: StatsBarItem[];
  className?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-t3)] w-24 truncate">
            {item.label}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--color-s700)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: item.color ?? "var(--color-b5)",
              }}
            />
          </div>
          <span className="text-xs font-medium text-[var(--color-t2)] min-w-[2rem] text-right">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
