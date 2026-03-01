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
  it("renders label and value", () => {
    render(<StatsBar label="Score" value={85} />);
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
  });
});

describe("ChatMessage", () => {
  it("renders message content", () => {
    render(<ChatMessage type="outgoing">Hello</ChatMessage>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
  it("renders all message types", () => {
    const types = ["outgoing", "incoming", "ai", "system"] as const;
    types.forEach((t) => {
      const { unmount } = render(<ChatMessage type={t}>{`Msg ${t}`}</ChatMessage>);
      expect(screen.getByText(`Msg ${t}`)).toBeInTheDocument();
      unmount();
    });
  });
});
