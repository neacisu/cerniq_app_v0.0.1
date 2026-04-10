// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { SlaTimer } from "./SlaTimer.js";

const meta = {
  title: "Cerniq/outreach/shared/SlaTimer",
  component: SlaTimer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof SlaTimer>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof SlaTimer>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <SlaTimer {...args} />,
} as unknown as Story;
