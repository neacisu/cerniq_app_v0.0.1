// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { DataTableToolbar } from "./DataTableToolbar.js";

const meta = {
  title: "Cerniq/data/DataTableToolbar",
  component: DataTableToolbar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof DataTableToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof DataTableToolbar>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <DataTableToolbar {...args} />,
} as unknown as Story;
