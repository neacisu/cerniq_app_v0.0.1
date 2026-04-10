// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ApprovalCard } from "./ApprovalCard.js";

const meta = {
  title: "Cerniq/data/ApprovalCard",
  component: ApprovalCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ApprovalCard>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ApprovalCard>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ApprovalCard {...args} />,
} as unknown as Story;
