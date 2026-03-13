interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  indeterminate?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  color = "var(--color-b5)",
  indeterminate = false,
}: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="pt">
      <div
        className={`pf${indeterminate ? " pf-indeterminate" : ""}`}
        style={{ width: indeterminate ? "35%" : `${pct}%`, background: color }}
      />
    </div>
  );
}
