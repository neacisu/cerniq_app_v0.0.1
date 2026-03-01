import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type LinePoint = { label: string; value: number };

export function LineTrendChart({ data }: { data: LinePoint[] }) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-s700)" />
          <XAxis dataKey="label" stroke="var(--color-t3)" />
          <YAxis stroke="var(--color-t3)" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-b5)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
