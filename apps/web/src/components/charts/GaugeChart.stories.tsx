// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { GaugeChart } from "./GaugeChart.js";

const meta = {
  title: "Cerniq/charts/GaugeChart",
  component: GaugeChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof GaugeChart>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof GaugeChart>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <GaugeChart {...args} />,
} as unknown as Story;
