// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { StageBadge } from "./StageBadge.js";

const meta = {
  title: "Cerniq/outreach/shared/StageBadge",
  component: StageBadge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof StageBadge>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof StageBadge>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <StageBadge {...args} />,
} as unknown as Story;
