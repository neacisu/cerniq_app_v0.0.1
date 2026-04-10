import { useId } from "react";

/**
 * Gauge NPS pe scală -100…+100 cu zone Detractori / Pasivi / Promotori (gradient).
 * Complementar față de scorul API 0–10 din nurturing: folosiți `deriveNpsIndexFromAvg10` din `nps-gauge-utils.ts`.
 */
type NpsGaugeProps = Readonly<{
  value: number;
  size?: "sm" | "md" | "lg";
  subtitle?: string;
}>;

const sizeMap = { sm: 140, md: 200, lg: 260 } as const;

export function NpsGauge({ value, size = "md", subtitle }: NpsGaugeProps) {
  const uid = useId().replaceAll(":", "");
  const dim = sizeMap[size];
  const w = dim;
  const h = Math.round(dim * 0.58);
  const cx = w / 2;
  const cy = h - 6;
  const r = Math.min(w, h) * 0.42;
  const clamped = Math.max(-100, Math.min(100, value));
  const t = (clamped + 100) / 200;
  const angleRad = Math.PI * (1 - t);
  const nx = cx + r * Math.cos(angleRad);
  const ny = cy - r * Math.sin(angleRad);

  const gradId = `nps-g-${uid}`;

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label={`NPS ${clamped}`}>
        <title>NPS {clamped}</title>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.55 0.2 25)" />
            <stop offset="50%" stopColor="oklch(0.75 0.14 95)" />
            <stop offset="100%" stopColor="oklch(0.65 0.17 145)" />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={14}
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="var(--color-t1)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill="var(--color-t1)" />
      </svg>
      <div className="text-center">
        <div className="text-lg font-bold tabular-nums text-t1">{clamped}</div>
        <div className="text-[10px] text-t4 uppercase tracking-wide">NPS (-100…+100)</div>
        {subtitle ? <div className="text-xs text-t3 mt-1 max-w-[220px]">{subtitle}</div> : null}
      </div>
    </div>
  );
}
