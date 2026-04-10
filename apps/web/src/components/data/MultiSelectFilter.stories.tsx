// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { MultiSelectFilter } from "./MultiSelectFilter.js";

const meta = {
  title: "Cerniq/data/MultiSelectFilter",
  component: MultiSelectFilter,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof MultiSelectFilter>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof MultiSelectFilter>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <MultiSelectFilter {...args} />,
} as unknown as Story;
