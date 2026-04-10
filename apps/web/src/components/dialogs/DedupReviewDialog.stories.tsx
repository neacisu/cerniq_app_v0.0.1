// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { DedupReviewDialog } from "./DedupReviewDialog.js";

const meta = {
  title: "Cerniq/dialogs/DedupReviewDialog",
  component: DedupReviewDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof DedupReviewDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof DedupReviewDialog>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <DedupReviewDialog {...args} />,
} as unknown as Story;
