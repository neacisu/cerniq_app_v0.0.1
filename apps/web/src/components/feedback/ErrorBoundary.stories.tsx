import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorBoundary } from "./ErrorBoundary.js";

type BoomProps = Readonly<{ shouldThrow: boolean }>;

function Boom({ shouldThrow }: BoomProps) {
  if (shouldThrow) throw new Error("Eroare demonstrativă Storybook");
  return <p className="text-t2">Conținut OK</p>;
}

const meta = {
  title: "Cerniq/Feedback/ErrorBoundary",
  component: ErrorBoundary,
  tags: ["autodocs"],
  /** `children` e obligatoriu pe `ErrorBoundary`; story-urile cu `render` înlocuiesc conținutul afișat. */
  args: { children: null },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ok: Story = {
  render: () => (
    <ErrorBoundary>
      <Boom shouldThrow={false} />
    </ErrorBoundary>
  ),
};

export const CatchesError: Story = {
  render: function R() {
    const [k, setK] = useState(0);
    return (
      <div>
        <button type="button" className="btn btp mb-4" onClick={() => setK((x) => x + 1)}>
          Remontează copilul care aruncă
        </button>
        <ErrorBoundary key={k}>
          <Boom shouldThrow />
        </ErrorBoundary>
      </div>
    );
  },
};
