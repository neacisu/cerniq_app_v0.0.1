import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const enrollMutate = vi.fn();
const sendMutate = vi.fn();
const takeoverMutate = vi.fn();

vi.mock("@/hooks/use-etapa2.js", () => ({
  useOutreachSequences: () => ({
    data: {
      data: [{ id: "s1", name: "Seq", steps: [{ id: "1" }], totalEnrolled: 2 }],
    },
  }),
  useEnrollSequence: () => ({
    mutateAsync: enrollMutate.mockResolvedValue(undefined),
    isPending: false,
  }),
  useSendMessage: () => ({
    mutateAsync: sendMutate.mockResolvedValue(undefined),
    isPending: false,
  }),
  useTakeover: () => ({
    mutateAsync: takeoverMutate.mockResolvedValue(undefined),
    isPending: false,
  }),
}));

import { EnrollSequenceDialog } from "@/components/outreach/dialogs/EnrollSequenceDialog.js";
import { SendMessageDialog } from "@/components/outreach/dialogs/SendMessageDialog.js";
import { TakeoverDialog } from "@/components/outreach/dialogs/TakeoverDialog.js";

function wrap(ui: React.ReactElement) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );
}

describe("dialoguri outreach", () => {
  beforeEach(() => {
    enrollMutate.mockClear();
    sendMutate.mockClear();
    takeoverMutate.mockClear();
  });

  it("EnrollSequenceDialog — 1 lead, select secvență, înrolare", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap(<EnrollSequenceDialog leadIds={["l1"]} onClose={onClose} />);
    expect(screen.getByText(/1 lead selectat/i)).toBeInTheDocument();
    await user.click(screen.getByText("Seq"));
    await user.click(screen.getByRole("button", { name: /Înrolează/i }));
    expect(enrollMutate).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("EnrollSequenceDialog — eroare la mutate", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    enrollMutate.mockRejectedValueOnce(new Error("fail"));
    wrap(<EnrollSequenceDialog leadIds={["a", "b"]} onClose={vi.fn()} />);
    await user.click(screen.getByText("Seq"));
    await user.click(screen.getByRole("button", { name: /Înrolează/i }));
    expect(toast.error).toHaveBeenCalledWith("Eroare la înrolare");
  });

  it("SendMessageDialog — canale, email, trimitere", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap(<SendMessageDialog leadId="L1" isHumanControlled onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /Email Cald/i }));
    await user.type(screen.getByPlaceholderText(/Subiect email/i), "Sub");
    await user.type(screen.getByPlaceholderText(/Scrie mesajul/i), "Hello");
    await user.click(screen.getByRole("button", { name: /^Trimite$/i }));
    expect(sendMutate).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("SendMessageDialog — lead necontrolat uman", () => {
    wrap(<SendMessageDialog leadId="x" isHumanControlled={false} onClose={vi.fn()} />);
    expect(screen.getByText(/control uman/i)).toBeInTheDocument();
  });

  it("TakeoverDialog — motiv și preluare", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap(<TakeoverDialog leadId="L1" companyName="ACME" onClose={onClose} />);
    await user.type(screen.getByPlaceholderText(/Client important/i), "motiv");
    await user.click(screen.getByRole("button", { name: /Preia Controlul/i }));
    expect(takeoverMutate).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
