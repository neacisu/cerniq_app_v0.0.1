// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { StatsBar } from "./StatsBar.js";

const meta = {
  title: "Cerniq/data/StatsBar",
  component: StatsBar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof StatsBar>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof StatsBar>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <StatsBar {...args} />,
} as unknown as Story;
