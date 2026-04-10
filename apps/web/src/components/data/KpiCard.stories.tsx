// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { KpiCard } from "./KpiCard.js";

const meta = {
  title: "Cerniq/data/KpiCard",
  component: KpiCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof KpiCard>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <KpiCard {...args} />,
} as unknown as Story;
