interface StatsBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

export function StatsBar({ label, value, max = 100, color = "var(--color-b5)" }: StatsBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="sbr">
      <span className="sbl2">{label}</span>
      <div className="sbt">
        <div className="sbf" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="sbc">{value}</span>
    </div>
  );
}
