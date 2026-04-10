// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { StatsGrid } from "./StatsGrid.js";

const meta = {
  title: "Cerniq/widgets/StatsGrid",
  component: StatsGrid,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof StatsGrid>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof StatsGrid>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <StatsGrid {...args} />,
} as unknown as Story;
