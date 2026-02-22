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
        <div
          key={item.label}
          className="flex items-center gap-[10px] mb-[10px]"
        >
          <span className="text-xs font-semibold w-20 shrink-0 text-[var(--color-t2)]">
            {item.label}
          </span>
          <div className="flex-1 h-2 bg-[oklch(.18_.018_256)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-[1200ms] ease-[cubic-bezier(.4,0,.2,1)]"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: item.color ?? "var(--color-b5)",
              }}
            />
          </div>
          <span className="text-xs font-bold font-[var(--font-mono)] text-[var(--color-t2)] w-[60px] text-right shrink-0">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
