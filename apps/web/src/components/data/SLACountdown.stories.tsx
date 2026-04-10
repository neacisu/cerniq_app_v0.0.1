// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { SLACountdown } from "./SLACountdown.js";

const meta = {
  title: "Cerniq/data/SLACountdown",
  component: SLACountdown,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof SLACountdown>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof SLACountdown>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <SLACountdown {...args} />,
} as unknown as Story;
