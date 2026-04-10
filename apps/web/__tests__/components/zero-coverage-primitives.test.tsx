import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ProgressRing } from "@/components/charts/ProgressRing.js";
import { DonutChart } from "@/components/charts/DonutChart.js";
import { DateRangeFilter } from "@/components/data/DateRangeFilter.js";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog.js";
import { DedupReviewDialog } from "@/components/dialogs/DedupReviewDialog.js";
import { TabsNav } from "@/components/navigation/TabsNav.js";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs.js";
import { PageHeader } from "@/components/navigation/PageHeader.js";
import { FormField } from "@/components/forms/FormField.js";
import { InputField } from "@/components/forms/InputField.js";
import { SelectField } from "@/components/forms/SelectField.js";
import { LoadingPage } from "@/components/feedback/LoadingPage.js";
import { LayerBadge } from "@/components/data/LayerBadge.js";
import { DataTableToolbar } from "@/components/data/DataTableToolbar.js";
import { Toaster } from "@/components/ui/toast.js";
import { Tooltip } from "@/components/ui/tooltip.js";

describe("componente UI fără coverage (batch primitive)", () => {
  it("ProgressRing normalizează și afișează procent", () => {
    render(<ProgressRing value={150} size={40} stroke={4} />);
    expect(screen.getByRole("img", { name: /Progress 100%/ })).toBeInTheDocument();
  });

  it("DonutChart randează cu date și culori fallback", () => {
    const { container } = render(
      <DonutChart
        data={[
          { name: "A", value: 1 },
          { name: "B", value: 2, color: "#f00" },
        ]}
      />,
    );
    expect(container.querySelector(".h-60")).toBeInTheDocument();
  });

  it("DateRangeFilter propagă modificări", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DateRangeFilter from="2024-01-01" to="2024-01-02" onChange={onChange} />,
    );
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="date"]');
    const fromIn = inputs[0];
    const toIn = inputs[1];
    expect(fromIn).toBeDefined();
    expect(toIn).toBeDefined();
    fireEvent.change(fromIn, { target: { value: "2024-03-01" } });
    expect(onChange).toHaveBeenCalledWith({ from: "2024-03-01", to: "2024-01-02" });
    fireEvent.change(toIn, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ from: "2024-01-01", to: undefined });
  });

  it("ConfirmationDialog — închis / deschis, variante și extra", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <ConfirmationDialog open={false} title="t" onCancel={onCancel} onConfirm={onConfirm} />,
    );
    expect(document.body.querySelector("h3")).toBeNull();

    rerender(
      <ConfirmationDialog
        open
        title="Titlu"
        description="Desc"
        variant="danger"
        confirmLabel="OK"
        cancelLabel="Nu"
        extraContent={<span data-testid="extra">x</span>}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Nu" }));
    expect(onCancel).toHaveBeenCalled();
    rerender(
      <ConfirmationDialog
        open
        title="t"
        variant="warning"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirma" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("DedupReviewDialog acțiuni", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onMerge = vi.fn();
    const onReject = vi.fn();
    render(
      <DedupReviewDialog
        open
        left={{ a: 1 }}
        right={{ b: 2 }}
        score={88.4}
        onClose={onClose}
        onMerge={onMerge}
        onReject={onReject}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Pastreaza separat/i }));
    expect(onReject).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Merge records/i }));
    expect(onMerge).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Inchide/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("TabsNav schimbă tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TabsNav
        tabs={[
          { key: "a", label: "A" },
          { key: "b", label: "B" },
        ]}
        active="a"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "B" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("Breadcrumbs cu link și curent", () => {
    render(
      <MemoryRouter>
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Here" }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });

  it("PageHeader cu breadcrumbs, subtitlu, acțiuni", () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="T"
          subtitle="S"
          breadcrumbs={[{ label: "X", to: "/x" }]}
          actions={<button type="button">act</button>}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "T" })).toBeInTheDocument();
  });

  it("FormField / InputField / SelectField", () => {
    const onChange = vi.fn();
    render(
      <>
        <FormField label="L" required hint="h" error="e">
          <input data-testid="c" />
        </FormField>
        <InputField label="In" value="v" onChange={onChange} error="err" required type="email" />
        <SelectField
          label="Sel"
          options={[
            { label: "A", value: "a" },
            { label: "B", value: "b" },
          ]}
          value="a"
          onChange={vi.fn()}
        />
      </>,
    );
    expect(screen.getByText("e")).toBeInTheDocument();
  });

  it("LoadingPage, LayerBadge, DataTableToolbar, Toaster", () => {
    render(
      <>
        <LoadingPage />
        <LayerBadge layer="gold" />
        <DataTableToolbar
          title="T"
          description="D"
          leftSlot={<span>left</span>}
          rightSlot={<span>right</span>}
        />
        <Toaster />
      </>,
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByText("GOLD")).toBeInTheDocument();
  });

  it("Tooltip randează trigger", () => {
    render(
      <Tooltip content="help">
        <button type="button">hover me</button>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: /hover me/i })).toBeInTheDocument();
  });
});
