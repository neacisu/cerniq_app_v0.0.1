// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { SearchableSelect } from "./SearchableSelect.js";

const meta = {
  title: "Cerniq/forms/SearchableSelect",
  component: SearchableSelect,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof SearchableSelect>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof SearchableSelect>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <SearchableSelect {...args} />,
} as unknown as Story;
