import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManualEntryForm } from "@/components/forms/ManualEntryForm.js";

describe("ManualEntryForm", () => {
  it("submit cu loading dezactivează butonul", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockImplementation(() => new Promise(() => undefined));
    render(<ManualEntryForm loading onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: /Se salveaza/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submit trimite payload când CUI valid și câmpuri minime", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ManualEntryForm onSubmit={onSubmit} />);
    const boxes = screen.getAllByRole("textbox");
    const companyField = boxes[0];
    if (companyField === undefined) {
      throw new Error("ManualEntryForm: lipsește primul textbox (company)");
    }
    await user.type(companyField, "Acme");
    await user.type(screen.getByPlaceholderText(/RO12345678/i), "16885226");
    await user.click(screen.getByRole("button", { name: /Adauga contact/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: "Acme",
        cui: expect.stringContaining("16885226"),
      }),
    );
  });
});
