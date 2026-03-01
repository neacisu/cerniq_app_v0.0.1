import { ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";

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

  return (
    <div style={{ width: dim, height: dim }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
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
      </ResponsiveContainer>
    </div>
  );
}
