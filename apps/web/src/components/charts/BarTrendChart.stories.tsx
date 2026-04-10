// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { BarTrendChart } from "./BarTrendChart.js";

const meta = {
  title: "Cerniq/charts/BarTrendChart",
  component: BarTrendChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof BarTrendChart>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof BarTrendChart>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <BarTrendChart {...args} />,
} as unknown as Story;
