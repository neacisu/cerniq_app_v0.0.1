// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { LineTrendChart } from "./LineTrendChart.js";

const meta = {
  title: "Cerniq/charts/LineTrendChart",
  component: LineTrendChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof LineTrendChart>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof LineTrendChart>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <LineTrendChart {...args} />,
} as unknown as Story;
