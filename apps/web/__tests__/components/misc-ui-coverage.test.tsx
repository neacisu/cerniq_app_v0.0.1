import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Separator } from "@/components/ui/separator.js";
import { BulkActionBar } from "@/components/data/BulkActionBar.js";
import { SearchInput } from "@/components/forms/SearchInput.js";
import { ApprovalCard } from "@/components/data/ApprovalCard.js";
import { PriorityBadge } from "@/components/outreach/shared/PriorityBadge.js";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary.js";
import { MetricsSparkline } from "@/components/cognitive/MetricsSparkline.js";
import { StatsGrid } from "@/components/widgets/StatsGrid.js";
import { SseLiveBadge } from "@/pages/dashboard/SseLiveBadge.js";
import { DataTablePagination } from "@/components/data/DataTablePagination.js";
import { sectionError } from "@/pages/dashboard/utils.js";
import type { ReviewPriority } from "@/lib/etapa2-api.js";

function ThrowBoom(): null {
  throw new Error("boom-test");
}

describe("Separator", () => {
  it("orizontal și vertical", () => {
    const { container, rerender } = render(<Separator />);
    expect(container.querySelector("hr")).toBeTruthy();
    rerender(<Separator orientation="vertical" />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});

describe("BulkActionBar", () => {
  it("ascuns la 0; afișat cu acțiuni", () => {
    const { rerender } = render(<BulkActionBar selectedCount={0} onClear={vi.fn()} />);
    expect(document.body.textContent).not.toContain("elemente selectate");

    rerender(
      <BulkActionBar
        selectedCount={2}
        onClear={vi.fn()}
        actions={<span data-testid="a">act</span>}
      />,
    );
    expect(screen.getByTestId("a")).toBeInTheDocument();
  });
});

describe("SearchInput", () => {
  it("propagă onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="ph" />);
    await user.type(screen.getByPlaceholderText("ph"), "ab");
    expect(onChange).toHaveBeenCalled();
  });
});

describe("ApprovalCard", () => {
  it("descriere opțională și urgență", () => {
    const onApprove = vi.fn();
    render(
      <ApprovalCard
        id="1"
        title="T"
        urgency="HIGH"
        confidence={50}
        description="D"
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText("D")).toBeInTheDocument();
  });
});

describe("PriorityBadge", () => {
  it("URGENT pulse și fallback la prioritate invalidă", () => {
    const { container, rerender } = render(<PriorityBadge priority="URGENT" />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    rerender(<PriorityBadge priority={"__bad__" as ReviewPriority} showIcon={false} />);
    expect(screen.getByText("Mediu")).toBeInTheDocument();
  });
});

describe("ErrorBoundary", () => {
  it("prinde eroare și afișează mesaj", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <ThrowBoom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText("boom-test")).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

describe("MetricsSparkline", () => {
  it("fără date și cu serie", () => {
    const { rerender } = render(<MetricsSparkline data={[]} />);
    expect(screen.getByText("Fără date")).toBeInTheDocument();
    rerender(<MetricsSparkline data={[{ t: 1, v: 2 }]} label="L" unit="%" />);
    expect(screen.getByText("L")).toBeInTheDocument();
  });
});

describe("StatsGrid", () => {
  it("apelează onNavigate când există path", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<StatsGrid items={[{ label: "A", value: "1", path: "/p" }]} onNavigate={onNavigate} />);
    const card = screen.getByText("1").closest(".kc");
    if (!card) throw new Error("KpiCard root not found");
    await user.click(card);
    expect(onNavigate).toHaveBeenCalledWith("/p");
  });
});

describe("SseLiveBadge", () => {
  it("etichetă implicită și personalizată", () => {
    const { rerender } = render(<SseLiveBadge />);
    expect(screen.getByText(/KPI Etapa 1/i)).toBeInTheDocument();
    rerender(<SseLiveBadge label="Custom" />);
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });
});

describe("DataTablePagination", () => {
  it("paginare și schimbare page size", async () => {
    const user = userEvent.setup();
    const onPage = vi.fn();
    const onSize = vi.fn();
    render(
      <DataTablePagination
        page={1}
        pageSize={10}
        total={95}
        onPageChange={onPage}
        pageSizeOptions={[10, 25]}
        onPageSizeChange={onSize}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Inainte/i }));
    expect(onPage).toHaveBeenCalled();
  });
});

describe("sectionError", () => {
  it("randează alertă", () => {
    render(sectionError("msg"));
    expect(screen.getByRole("alert")).toHaveTextContent("msg");
  });
});
