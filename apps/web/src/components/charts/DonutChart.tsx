import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type DonutPoint = { name: string; value: number; color?: string };

const fallbackColors = ["var(--color-b5)", "var(--color-ok)", "var(--color-wa)", "var(--color-er)"];

export function DonutChart({ data }: { data: DonutPoint[] }) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? fallbackColors[index % fallbackColors.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
