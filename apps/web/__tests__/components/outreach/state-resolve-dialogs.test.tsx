import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StateChangeDialog } from "@/components/outreach/dialogs/StateChangeDialog.js";
import { ResolveReviewDialog } from "@/components/outreach/dialogs/ResolveReviewDialog.js";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const updateLead = vi.fn();
const resolveReview = vi.fn();

vi.mock("@/hooks/use-etapa2.js", () => ({
  useUpdateLead: () => ({ mutateAsync: updateLead, isPending: false }),
  useResolveReview: () => ({ mutateAsync: resolveReview, isPending: false }),
}));

describe("StateChangeDialog", () => {
  beforeEach(() => {
    updateLead.mockReset();
    updateLead.mockResolvedValue(undefined);
  });

  it("lead unic: selectează stare și aplică", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StateChangeDialog leadId="L1" currentState="COLD" onClose={onClose} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Contactat WA/i }));
    await user.click(screen.getByRole("button", { name: /Aplică Schimbare/i }));
    expect(updateLead).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("bulk: blochează CONVERTED", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StateChangeDialog leadIds={["a", "b"]} currentState="NEGOTIATION" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Convertit/i }));
    await user.click(screen.getByRole("button", { name: /Aplică Schimbare/i }));
    expect(toast.error).toHaveBeenCalled();
    expect(updateLead).not.toHaveBeenCalled();
  });

  it("fără tranziții (CONVERTED)", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StateChangeDialog leadId="x" currentState="CONVERTED" onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Nicio tranziție validă/i)).toBeInTheDocument();
  });
});

describe("ResolveReviewDialog", () => {
  beforeEach(() => {
    resolveReview.mockReset();
    resolveReview.mockResolvedValue(undefined);
  });

  it("eroare la rezolvare afișează toast", async () => {
    const user = userEvent.setup();
    resolveReview.mockRejectedValueOnce(new Error("x"));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ResolveReviewDialog reviewId="r1" onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: /Salvează Decizia/i }));
    const { toast } = await import("sonner");
    expect(toast.error).toHaveBeenCalled();
  });

  it("rezolvă cu succes și închide", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    resolveReview.mockResolvedValue(undefined);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ResolveReviewDialog reviewId="r1" onClose={onClose} />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: /Salvează Decizia/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("acțiune EDITED afișează textarea", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ResolveReviewDialog reviewId="r2" originalContent="orig" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Editează/i }));
    expect(screen.getByLabelText(/Conținut editat/i)).toBeInTheDocument();
  });
});
