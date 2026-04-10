// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { MetricsSparkline } from "./MetricsSparkline.js";

const meta = {
  title: "Cerniq/cognitive/MetricsSparkline",
  component: MetricsSparkline,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof MetricsSparkline>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof MetricsSparkline>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <MetricsSparkline {...args} />,
} as unknown as Story;
