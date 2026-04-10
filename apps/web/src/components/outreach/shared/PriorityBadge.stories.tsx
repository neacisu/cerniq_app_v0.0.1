// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { PriorityBadge } from "./PriorityBadge.js";

const meta = {
  title: "Cerniq/outreach/shared/PriorityBadge",
  component: PriorityBadge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof PriorityBadge>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof PriorityBadge>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <PriorityBadge {...args} />,
} as unknown as Story;
