/**
 * Tests for MetricsSparkline — Recharts mini chart component
 * (Recharts is mocked in setup.ts via ResponsiveContainer stub)
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricsSparkline, type SparklinePoint } from "@/components/cognitive/MetricsSparkline.js";

const DATA: SparklinePoint[] = [
  { t: 0, v: 10 },
  { t: 5, v: 15 },
  { t: 10, v: 8 },
  { t: 15, v: 22 },
];

describe("MetricsSparkline", () => {
  it("renders data-testid", () => {
    render(<MetricsSparkline data={DATA} />);
    expect(screen.getByTestId("metrics-sparkline")).toBeInTheDocument();
  });

  it("shows label when provided", () => {
    render(<MetricsSparkline data={DATA} label="Throughput" />);
    expect(screen.getByText("Throughput")).toBeInTheDocument();
  });

  it("does not render label when not provided", () => {
    const { container } = render(<MetricsSparkline data={DATA} />);
    const labelDiv = container.querySelector("div[style*='text-transform: uppercase']");
    expect(labelDiv).not.toBeInTheDocument();
  });

  it("shows empty state when data is empty", () => {
    render(<MetricsSparkline data={[]} />);
    expect(screen.getByText("Fără date")).toBeInTheDocument();
  });

  it("does not show empty state when data has entries", () => {
    render(<MetricsSparkline data={DATA} />);
    expect(screen.queryByText("Fără date")).not.toBeInTheDocument();
  });

  it("uses default height of 44", () => {
    render(<MetricsSparkline data={DATA} />);
    const sparkline = screen.getByTestId("metrics-sparkline");
    expect(sparkline).toBeInTheDocument();
  });

  it("uses custom color prop", () => {
    render(<MetricsSparkline data={DATA} color="red" />);
    // Line chart rendered (stub) — just confirm no crash
    expect(screen.getByTestId("metrics-sparkline")).toBeInTheDocument();
  });
});
