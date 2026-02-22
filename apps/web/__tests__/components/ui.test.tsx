import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Badge, SBadge, TBadge } from "@/components/ui/badge.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Separator } from "@/components/ui/separator.js";
import { Skeleton } from "@/components/ui/skeleton.js";

describe("Button Component", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });
  it("renders primary variant", () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText("Primary")).toBeInTheDocument();
  });
  it("renders outline variant", () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByText("Outline")).toBeInTheDocument();
  });
  it("renders ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByText("Ghost")).toBeInTheDocument();
  });
  it("renders danger variant", () => {
    render(<Button variant="danger">Danger</Button>);
    expect(screen.getByText("Danger")).toBeInTheDocument();
  });
  it("renders success variant", () => {
    render(<Button variant="success">Success</Button>);
    expect(screen.getByText("Success")).toBeInTheDocument();
  });
  it("handles disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText("Disabled")).toBeDisabled();
  });
});

describe("Input Component", () => {
  it("renders input", () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText("Type here")).toBeInTheDocument();
  });
  it("handles error state", () => {
    render(<Input error placeholder="Error" />);
    expect(screen.getByPlaceholderText("Error")).toBeInTheDocument();
  });
});

describe("Badge Components", () => {
  it("renders Badge", () => {
    render(<Badge>Test</Badge>);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
  it("renders SBadge with status", () => {
    render(<SBadge status="COMPLETED" />);
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
  });
  it("renders TBadge with tier", () => {
    render(<TBadge tier="gold" />);
    expect(screen.getByText("GOLD")).toBeInTheDocument();
  });
  it("renders all 9 badge variants", () => {
    const variants = [
      "bronze",
      "silver",
      "gold",
      "ok",
      "warning",
      "error",
      "info",
      "neutral",
      "brand",
    ] as const;
    variants.forEach((v) => {
      const { unmount } = render(<Badge variant={v}>{v}</Badge>);
      expect(screen.getByText(v)).toBeInTheDocument();
      unmount();
    });
  });
});

describe("Card Component", () => {
  it("renders card with content", () => {
    render(
      <Card>
        <CardBody>Content</CardBody>
      </Card>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
  it("renders card header and title", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>,
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
  });
});

describe("Utility Components", () => {
  it("renders Spinner", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
  it("renders Separator", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
  it("renders Skeleton", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
