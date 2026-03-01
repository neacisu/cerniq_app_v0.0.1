type ProgressRingProps = {
  value: number;
  size?: number;
  stroke?: number;
};

export function ProgressRing({ value, size = 96, stroke = 8 }: ProgressRingProps) {
  const normalized = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <svg width={size} height={size} role="img" aria-label={`Progress ${normalized}%`}>
      <circle
        stroke="var(--color-s700)"
        fill="transparent"
        strokeWidth={stroke}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke="var(--color-b5)"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="var(--color-t1)"
        fontSize="14"
      >
        {normalized}%
      </text>
    </svg>
  );
}
