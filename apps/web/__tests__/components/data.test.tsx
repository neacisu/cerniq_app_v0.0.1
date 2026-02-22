import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "@/components/data/KpiCard";
import { ProgressBar } from "@/components/data/ProgressBar";
import { StatusDot } from "@/components/data/StatusDot";
import { StatsBar } from "@/components/data/StatsBar";
import { ChatMessage } from "@/components/data/ChatMessage";

describe("KpiCard", () => {
  it("renders value and label", () => {
    render(<KpiCard label="Test" value="100" icon="Activity" />);
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
  it("renders change indicator", () => {
    render(<KpiCard label="KPI" value="50" icon="Activity" change="+12%" />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });
});

describe("ProgressBar", () => {
  it("renders progress bar", () => {
    const { container } = render(<ProgressBar value={75} />);
    expect(container.firstChild).toBeInTheDocument();
  });
  it("shows label when enabled", () => {
    render(<ProgressBar value={50} showLabel />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});

describe("StatusDot", () => {
  it("renders all states", () => {
    const states = ["ok", "warning", "error", "info", "neutral"] as const;
    states.forEach((s) => {
      const { container, unmount } = render(<StatusDot status={s} />);
      expect(container.firstChild).toBeInTheDocument();
      unmount();
    });
  });
});

describe("StatsBar", () => {
  it("renders items", () => {
    render(
      <StatsBar
        items={[
          { label: "A", value: 10 },
          { label: "B", value: 20 },
        ]}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});

describe("ChatMessage", () => {
  it("renders message content", () => {
    render(<ChatMessage type="out" content="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
  it("renders all message types", () => {
    const types = ["out", "in", "ai", "system"] as const;
    types.forEach((t) => {
      const { unmount } = render(<ChatMessage type={t} content={`Msg ${t}`} />);
      expect(screen.getByText(`Msg ${t}`)).toBeInTheDocument();
      unmount();
    });
  });
});
