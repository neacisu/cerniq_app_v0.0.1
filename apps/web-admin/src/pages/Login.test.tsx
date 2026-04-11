import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "./Login.js";

const loginMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("../hooks/use-admin-auth.js", () => ({
  useAdminAuth: () => ({
    login: loginMock,
    logout: vi.fn(),
    token: null,
    user: null,
    isAuthenticated: false,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("admin login page", () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
  });

  it("shows validation when email or password is missing", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /autentificare/i }));

    expect(screen.getByText(/introdu email-ul si parola/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("afișează mesajul din Error la login eșuat", async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new Error("bad password"));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "admin@cerniq.app");
    await user.type(screen.getByLabelText(/parola/i), "x");
    await user.click(screen.getByRole("button", { name: /autentificare/i }));

    expect(screen.getByText("bad password")).toBeInTheDocument();
  });

  it("afișează mesaj generic când login aruncă non-Error", async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue("svc");

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "admin@cerniq.app");
    await user.type(screen.getByLabelText(/parola/i), "x");
    await user.click(screen.getByRole("button", { name: /autentificare/i }));

    expect(screen.getByText(/autentificare esuata/i)).toBeInTheDocument();
  });

  it("submits email and password through admin auth context", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "admin@cerniq.app");
    await user.type(screen.getByLabelText(/parola/i), "SuperSecret123!");
    await user.click(screen.getByRole("button", { name: /autentificare/i }));

    expect(loginMock).toHaveBeenCalledWith("admin@cerniq.app", "SuperSecret123!");
    expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true });
  });
});
