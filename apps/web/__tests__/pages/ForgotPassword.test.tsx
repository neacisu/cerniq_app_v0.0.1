import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ForgotPassword } from "@/pages/auth/ForgotPassword.js";

describe("ForgotPassword", () => {
  it("nu simulează succes API — explică indisponibilitatea resetării", () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Resetarea automată nu este disponibilă momentan/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nu are încă endpoint API pentru cereri de resetare parolă/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nu se trimite niciun email/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Înapoi la autentificare/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
