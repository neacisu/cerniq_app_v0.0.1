// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { DataTable } from "./DataTable.js";

const meta = {
  title: "Cerniq/data/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof DataTable>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <DataTable {...args} />,
} as unknown as Story;
