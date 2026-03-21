import { RadialBarChart, RadialBar } from "recharts";

type GaugeChartProps = {
  value: number;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: 120,
  md: 180,
  lg: 240,
} as const;

export function GaugeChart({ value, size = "md" }: GaugeChartProps) {
  const dim = sizeMap[size];
  const data = [{ name: "score", value: Math.max(0, Math.min(100, value)) }];

  // Dimensiuni fixe pe RadialBarChart (fără ResponsiveContainer): în flex/grid,
  // ResponsiveContainer măsoară adesea -1×-1 la primul paint → warning Recharts.
  return (
    <div className="shrink-0" style={{ width: dim, height: dim, minWidth: dim, minHeight: dim }}>
      <RadialBarChart
        width={dim}
        height={dim}
        cx="50%"
        cy="50%"
        innerRadius="70%"
        outerRadius="100%"
        data={data}
        startAngle={180}
        endAngle={0}
      >
        <RadialBar dataKey="value" cornerRadius={8} fill="var(--color-b5)" />
      </RadialBarChart>
    </div>
  );
}
