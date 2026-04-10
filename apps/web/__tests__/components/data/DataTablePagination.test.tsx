import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTablePagination } from "@/components/data/DataTablePagination.js";

describe("DataTablePagination", () => {
  it("afișează interval pagini și dezactivează Inapoi pe prima pagină", () => {
    const onPageChange = vi.fn();
    render(<DataTablePagination page={1} pageSize={10} total={25} onPageChange={onPageChange} />);
    expect(screen.getByText(/Pagina 1 din 3/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Inapoi/i })).toBeDisabled();
  });

  it("Inainte crește pagina și Inapoi scade", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<DataTablePagination page={2} pageSize={10} total={25} onPageChange={onPageChange} />);
    await user.click(screen.getByRole("button", { name: /Inainte/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole("button", { name: /Inapoi/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("afișează selector page size când pageSizeOptions și onPageSizeChange sunt setate", () => {
    render(
      <DataTablePagination
        page={1}
        pageSize={10}
        total={100}
        onPageChange={vi.fn()}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent(/10 \/ pagina/);
  });
});
