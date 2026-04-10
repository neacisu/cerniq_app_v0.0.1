// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { FunnelChart } from "./FunnelChart.js";

const meta = {
  title: "Cerniq/charts/FunnelChart",
  component: FunnelChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof FunnelChart>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof FunnelChart>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <FunnelChart {...args} />,
} as unknown as Story;
