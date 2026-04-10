import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CuiInputField } from "@/components/forms/CuiInputField.js";

describe("CuiInputField", () => {
  it("gol: fără eroare vizibilă", () => {
    const onChange = () => undefined;
    render(<CuiInputField value="" onChange={onChange} />);
    expect(screen.queryByText(/CUI invalid/)).not.toBeInTheDocument();
  });

  it("CUI invalid (o singură cifră): afișează eroare", () => {
    render(<CuiInputField value="1" onChange={vi.fn()} />);
    expect(screen.getByText("CUI invalid")).toBeInTheDocument();
  });
});
