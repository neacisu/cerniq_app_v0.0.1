import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SentimentIndicator } from "@/components/outreach/shared/SentimentIndicator.js";

describe("SentimentIndicator", () => {
  it("null: necunoscut", () => {
    render(<SentimentIndicator score={null} showLabel showScore />);
    expect(screen.getByTitle(/Necunoscut/)).toBeInTheDocument();
  });

  it("pozitiv / neutru / negativ / foarte negativ", () => {
    const { rerender } = render(<SentimentIndicator score={60} variant="icon" showLabel />);
    expect(screen.getByText("Pozitiv")).toBeInTheDocument();
    rerender(<SentimentIndicator score={10} variant="icon" showLabel />);
    expect(screen.getByText("Neutru")).toBeInTheDocument();
    rerender(<SentimentIndicator score={-10} variant="icon" showLabel />);
    expect(screen.getByText("Negativ")).toBeInTheDocument();
    rerender(<SentimentIndicator score={-80} variant="icon" showLabel />);
    expect(screen.getByText("Foarte Negativ")).toBeInTheDocument();
  });

  it("variant bar cu scor afișat", () => {
    render(<SentimentIndicator score={-5} variant="bar" showScore />);
    expect(screen.getByText("-5")).toBeInTheDocument();
  });

  it("variant compact cu scor pozitiv (+prefix)", () => {
    render(<SentimentIndicator score={3} variant="compact" showScore />);
    expect(screen.getByText("+3")).toBeInTheDocument();
  });
});
