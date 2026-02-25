interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
}

export function ProgressBar({ value, max = 100, color = "var(--color-b5)" }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="pt">
      <div className="pf" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
