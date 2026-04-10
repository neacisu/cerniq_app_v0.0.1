import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CuiInputField } from "@/components/forms/CuiInputField.js";

describe("CuiInputField", () => {
  it("gol: valid, hint Modulo-11", () => {
    const onChange = vi.fn();
    render(<CuiInputField value="" onChange={onChange} />);
    expect(screen.getByText(/Modulo-11 activa/i)).toBeInTheDocument();
  });

  it("prea scurt: invalid", () => {
    const onChange = vi.fn();
    render(<CuiInputField value="1" onChange={onChange} />);
    expect(screen.getByText("CUI invalid")).toBeInTheDocument();
  });

  it("CUI valid (Modulo-11) — cifră de control corectă", () => {
    const onChange = vi.fn();
    render(<CuiInputField value="13548146" onChange={onChange} />);
    expect(screen.getByText(/Modulo-11 activa/i)).toBeInTheDocument();
    expect(screen.queryByText("CUI invalid")).not.toBeInTheDocument();
  });
});
