import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NpsGauge } from "@/components/etapa5/NpsGauge.js";

describe("NpsGauge", () => {
  it("afișează valoarea clampată", () => {
    render(<NpsGauge value={42} />);
    expect(screen.getByLabelText(/NPS 42/)).toBeInTheDocument();
  });
});
