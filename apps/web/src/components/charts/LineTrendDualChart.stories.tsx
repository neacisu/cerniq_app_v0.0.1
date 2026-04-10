// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { LineTrendDualChart } from "./LineTrendDualChart.js";

const meta = {
  title: "Cerniq/charts/LineTrendDualChart",
  component: LineTrendDualChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof LineTrendDualChart>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof LineTrendDualChart>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <LineTrendDualChart {...args} />,
} as unknown as Story;
