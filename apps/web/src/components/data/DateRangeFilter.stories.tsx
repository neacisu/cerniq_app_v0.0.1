// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { DateRangeFilter } from "./DateRangeFilter.js";

const meta = {
  title: "Cerniq/data/DateRangeFilter",
  component: DateRangeFilter,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof DateRangeFilter>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof DateRangeFilter>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <DateRangeFilter {...args} />,
} as unknown as Story;
