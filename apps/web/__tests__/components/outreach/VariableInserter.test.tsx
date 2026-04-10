import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { VariableInserter } from "@/components/outreach/templates/VariableInserter.js";

describe("VariableInserter", () => {
  it("fără ref: append token la sfârșit", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VariableInserter textareaRef={{ current: null }} value="Hi " onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /\{\{companyName\}\}/ }));
    expect(onChange).toHaveBeenCalledWith("Hi {{companyName}}");
  });

  it("cu ref: inserează la cursor și păstrează restul textului", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const ref = createRef<HTMLTextAreaElement>();
    const { rerender } = render(
      <>
        <textarea ref={ref} data-testid="ta" defaultValue="ab" readOnly />
        <VariableInserter textareaRef={ref} value="ab" onChange={onChange} />
      </>,
    );
    const ta = screen.getByTestId("ta") as HTMLTextAreaElement;
    ta.focus();
    ta.setSelectionRange(1, 1);
    await user.click(screen.getByRole("button", { name: /\{\{email\}\}/ }));
    expect(onChange).toHaveBeenCalledWith("a{{email}}b");
    rerender(
      <>
        <textarea ref={ref} data-testid="ta" defaultValue="a{{email}}b" readOnly />
        <VariableInserter textareaRef={ref} value="a{{email}}b" onChange={onChange} />
      </>,
    );
  });
});
