// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { DonutChart } from "./DonutChart.js";

const meta = {
  title: "Cerniq/charts/DonutChart",
  component: DonutChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof DonutChart>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof DonutChart>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <DonutChart {...args} />,
} as unknown as Story;
