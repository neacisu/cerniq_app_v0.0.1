import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Drawer } from "@/components/drawers/Drawer.js";
import { SearchableSelect } from "@/components/forms/SearchableSelect.js";
import { MultiSelectFilter } from "@/components/data/MultiSelectFilter.js";
import { CompanyDetailsDialog } from "@/components/dialogs/CompanyDetailsDialog.js";
import { CuiInputField } from "@/components/forms/CuiInputField.js";
import { PhoneInputField } from "@/components/forms/PhoneInputField.js";
import { ManualEntryForm } from "@/components/forms/ManualEntryForm.js";
import { ImportMappingForm } from "@/components/forms/ImportMappingForm.js";

describe("Drawer, formulare, dialog companie", () => {
  it("Drawer Escape, backdrop, subtitlu", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <Drawer open={false} onClose={onClose} title="T">
        body
      </Drawer>,
    );
    expect(screen.queryByText("body")).toBeNull();
    rerender(
      <Drawer open onClose={onClose} title="T" subtitle="S">
        <p>body</p>
      </Drawer>,
    );
    expect(screen.getByText("body")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    rerender(
      <Drawer open onClose={onClose} title="T">
        body
      </Drawer>,
    );
    const backdrop = document.body.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    if (!backdrop) throw new Error("expected backdrop node for Drawer");
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: /Inchide/i }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("SearchableSelect filtrează opțiuni", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect
        options={[
          { label: "Alpha", value: "a" },
          { label: "Beta", value: "b" },
        ]}
        onChange={onChange}
      />,
    );
    await user.type(screen.getByPlaceholderText(/Filtreaza optiuni/i), "bet");
  });

  it("MultiSelectFilter adaugă și elimină valori", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MultiSelectFilter
        options={[
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ]}
        values={["a"]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /A x/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("CompanyDetailsDialog tab-uri", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <CompanyDetailsDialog
        open
        company={{
          denumire: "X",
          cui: "1",
          email: "e@e.e",
          phone: "p",
          metadata: { k: 1 },
        }}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Financial" }));
    await user.click(screen.getByRole("button", { name: "Contact" }));
    await user.click(screen.getByRole("button", { name: "Enrichment" }));
    await user.click(screen.getByRole("button", { name: /Inchide/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("CuiInputField valid / invalid", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<CuiInputField value="" onChange={onChange} />);
    expect(screen.getByText(/Modulo-11 activa/i)).toBeInTheDocument();
    rerender(<CuiInputField value="5" onChange={onChange} />);
    expect(screen.getByText("CUI invalid")).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText(/RO12345678/i));
    await user.type(screen.getByPlaceholderText(/RO12345678/i), "16885226");
  });

  it("PhoneInputField normalizează și validează", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhoneInputField value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText(/40722123456/i);
    await user.type(input, "0722123456");
    expect(onChange).toHaveBeenCalled();
  });

  it("ManualEntryForm submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ManualEntryForm onSubmit={onSubmit} />);
    const firstInp = document.querySelectorAll(".inp")[0];
    expect(firstInp).toBeInstanceOf(HTMLInputElement);
    await user.type(firstInp, "Co");
    await user.click(screen.getByRole("button", { name: /Adauga contact/i }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("ImportMappingForm submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ImportMappingForm
        sourceColumns={["col1"]}
        targetFields={[{ label: "Nume", value: "name" }]}
        initial={{ delimiter: ";", hasHeader: false, mappings: {} }}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Salveaza mapping/i }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
