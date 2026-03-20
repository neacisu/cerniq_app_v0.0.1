import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type DonutPoint = { name: string; value: number; color?: string };

const FALLBACK_COLORS = [
  "var(--color-b5)",
  "var(--color-ok)",
  "var(--color-wa)",
  "var(--color-er)",
] as const;

export function DonutChart({ data }: Readonly<{ data: readonly DonutPoint[] }>) {
  // Recharts v3: per-sector fill is provided via the data array (Cell is deprecated).
  // Each item gets its explicit color, or a fallback from the design-system palette.
  const pieData = data.map((entry, index) => ({
    ...entry,
    fill: entry.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip />
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
