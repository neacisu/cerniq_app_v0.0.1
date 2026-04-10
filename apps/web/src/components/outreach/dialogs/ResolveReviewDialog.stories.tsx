// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ResolveReviewDialog } from "./ResolveReviewDialog.js";

const meta = {
  title: "Cerniq/outreach/dialogs/ResolveReviewDialog",
  component: ResolveReviewDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ResolveReviewDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ResolveReviewDialog>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ResolveReviewDialog {...args} />,
} as unknown as Story;
