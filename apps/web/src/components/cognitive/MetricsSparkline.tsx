import { memo } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartTooltip } from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SparklinePoint = { t: number; v: number };

interface MetricsSparklineProps {
  data: SparklinePoint[];
  color?: string;
  height?: number;
  label?: string;
  /** unit label displayed next to values in tooltip */
  unit?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MetricsSparkline = memo(function MetricsSparkline({
  data,
  color = "var(--color-b5)",
  height = 44,
  label,
  unit = "",
}: MetricsSparklineProps) {
  return (
    <div data-testid="metrics-sparkline">
      {label && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--color-t3)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 4,
          }}
        >
          {label}
        </div>
      )}

      {data.length === 0 ? (
        <div
          style={{
            height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "var(--color-t4)",
          }}
        >
          Fără date
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <RechartTooltip
              contentStyle={{
                background: "var(--color-s800)",
                border: "1px solid oklch(0.22 0.018 255 / 60%)",
                borderRadius: 6,
                fontSize: 11,
                padding: "4px 8px",
              }}
              labelStyle={{ display: "none" }}
              formatter={(v) => [`${String(v)}${unit}`, label ?? "val"]}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});
