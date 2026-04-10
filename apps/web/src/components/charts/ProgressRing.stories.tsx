// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ProgressRing } from "./ProgressRing.js";

const meta = {
  title: "Cerniq/charts/ProgressRing",
  component: ProgressRing,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ProgressRing>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ProgressRing>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ProgressRing {...args} />,
} as unknown as Story;
