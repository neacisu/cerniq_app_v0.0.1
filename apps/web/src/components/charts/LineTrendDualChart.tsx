import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type LineTrendDualPoint = Readonly<{
  label: string;
  primary: number;
  secondary: number;
}>;

type LineTrendDualChartProps = Readonly<{
  data: readonly LineTrendDualPoint[];
  primaryName: string;
  secondaryName: string;
  primaryColor?: string;
  secondaryColor?: string;
}>;

export function LineTrendDualChart({
  data,
  primaryName,
  secondaryName,
  primaryColor = "var(--color-ok)",
  secondaryColor = "var(--color-er)",
}: LineTrendDualChartProps) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...data]}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-s700)" />
          <XAxis dataKey="label" stroke="var(--color-t3)" />
          <YAxis stroke="var(--color-t3)" />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="primary"
            name={primaryName}
            stroke={primaryColor}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="secondary"
            name={secondaryName}
            stroke={secondaryColor}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
