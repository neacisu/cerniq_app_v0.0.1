import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { BrainBatchRedirect } from "@/routing/brain-batch-redirect.js";

describe("BrainBatchRedirect", () => {
  it("redirecționează /brain/:batchId către /brain?batch= (URL-encoded)", async () => {
    const router = createMemoryRouter(
      [{ path: "/brain/:batchId", element: <BrainBatchRedirect /> }],
      { initialEntries: ["/brain/my%20id"] },
    );
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/brain");
      expect(router.state.location.search).toBe(`?batch=${encodeURIComponent("my id")}`);
    });
  });

  it("fără batchId redirecționează către /brain", async () => {
    const router = createMemoryRouter([{ path: "/brain", element: <BrainBatchRedirect /> }], {
      initialEntries: ["/brain"],
    });
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/brain");
      expect(router.state.location.search).toBe("");
    });
  });
});
