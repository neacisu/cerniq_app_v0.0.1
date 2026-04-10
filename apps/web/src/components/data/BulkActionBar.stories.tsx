// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { BulkActionBar } from "./BulkActionBar.js";

const meta = {
  title: "Cerniq/data/BulkActionBar",
  component: BulkActionBar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof BulkActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof BulkActionBar>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <BulkActionBar {...args} />,
} as unknown as Story;
