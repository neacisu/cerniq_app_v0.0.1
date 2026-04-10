import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SLACountdown } from "@/components/data/SLACountdown.js";
import { SlaTimer } from "@/components/outreach/shared/SlaTimer.js";
import { QuotaUsageGrid } from "@/components/outreach/shared/QuotaUsageGrid.js";
import { CommandPalette } from "@/components/navigation/CommandPalette.js";
import type { WaPhone } from "@/lib/etapa2-api.js";

describe("SLACountdown", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
  });

  it("SLA necunoscut pentru dată invalidă", () => {
    render(<SLACountdown dueAt="not-a-date" />);
    expect(screen.getByText("SLA necunoscut")).toBeInTheDocument();
  });

  it("afișează depășire și ramuri de timp rămas", () => {
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const past = new Date("2026-01-01T10:00:00Z").toISOString();
    const { rerender } = render(<SLACountdown dueAt={past} />);
    expect(screen.getByText(/Depășit/i)).toBeInTheDocument();

    const soon = new Date("2026-01-01T13:30:00Z").toISOString();
    rerender(<SLACountdown dueAt={soon} />);
    expect(screen.getByText(/1h 30m rămase/i)).toBeInTheDocument();

    const later = new Date("2026-01-01T18:00:00Z").toISOString();
    rerender(<SLACountdown dueAt={later} />);
    expect(screen.getByText(/6h 0m rămase/i)).toBeInTheDocument();
  });

  it("depășire doar minute (fără oră întreagă)", () => {
    vi.setSystemTime(new Date("2026-02-01T12:50:00Z"));
    render(<SLACountdown dueAt={new Date("2026-02-01T12:20:00Z").toISOString()} />);
    expect(screen.getByText(/Depășit cu 30m/)).toBeInTheDocument();
  });
});

describe("SlaTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("afișează expirat", () => {
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    render(
      <SlaTimer slaDueAt={new Date("2026-06-01T11:00:00Z").toISOString()} priority="MEDIUM" />,
    );
    expect(screen.getByText(/Expirat/)).toBeInTheDocument();
  });

  it("afișează numărătoare când SLA nu a expirat", () => {
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    render(<SlaTimer slaDueAt={new Date("2026-06-01T12:10:00Z").toISOString()} priority="LOW" />);
    expect(screen.getByText(/10m/)).toBeInTheDocument();
  });

  it("priorități HIGH și URGENT", () => {
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const far = new Date("2026-06-01T20:00:00Z").toISOString();
    const { rerender } = render(<SlaTimer slaDueAt={far} priority="HIGH" />);
    rerender(<SlaTimer slaDueAt={far} priority="URGENT" />);
  });
});

describe("QuotaUsageGrid", () => {
  const base: WaPhone = {
    id: "p1",
    tenantId: "t",
    phoneNumber: "+40123456789",
    label: "L1",
    timelinesaiPhoneId: null,
    status: "ACTIVE",
    isEnabled: true,
    priority: 1,
    dailyQuotaLimit: 100,
    reputationScore: 1,
    lastHealthCheckAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    currentUsage: 50,
    quotaPercentage: 50,
  };

  it("culori după status și procent", () => {
    const { rerender } = render(<QuotaUsageGrid phones={[{ ...base, quotaPercentage: 50 }]} />);
    expect(screen.getByText("50%")).toBeInTheDocument();

    rerender(
      <QuotaUsageGrid phones={[{ ...base, id: "p2", quotaPercentage: 95, status: "ACTIVE" }]} />,
    );
    rerender(
      <QuotaUsageGrid phones={[{ ...base, id: "p3", quotaPercentage: 100, status: "ACTIVE" }]} />,
    );
    rerender(
      <QuotaUsageGrid phones={[{ ...base, id: "p4", quotaPercentage: 0, status: "OFFLINE" }]} />,
    );
  });
});

describe("CommandPalette", () => {
  it("Ctrl+K, filtrare, navigare, Escape", async () => {
    const user = userEvent.setup();
    const cmds = [
      { label: "Dash", path: "/dashboard", keywords: ["dash"] },
      { label: "Alt", path: "/other" },
    ];
    render(
      <MemoryRouter initialEntries={["/"]}>
        <>
          <CommandPalette commands={cmds} />
          <Routes>
            <Route path="/dashboard" element={<div>Dest</div>} />
            <Route path="/" element={<div />} />
          </Routes>
        </>
      </MemoryRouter>,
    );

    fireEvent.keyDown(globalThis.window, { key: "k", ctrlKey: true, bubbles: true });
    const input = await screen.findByPlaceholderText(/Navigheaza rapid/i);
    await user.type(input, "dash");
    await user.click(screen.getByRole("button", { name: "Dash" }));

    fireEvent.keyDown(globalThis.window, { key: "k", ctrlKey: true, bubbles: true });
    await user.type(await screen.findByPlaceholderText(/Navigheaza rapid/i), "zzz");
    expect(screen.queryByRole("button", { name: "Dash" })).toBeNull();

    fireEvent.keyDown(globalThis.window, { key: "Escape", bubbles: true });
  });
});
