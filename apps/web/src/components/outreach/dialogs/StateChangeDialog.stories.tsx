// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { StateChangeDialog } from "./StateChangeDialog.js";

const meta = {
  title: "Cerniq/outreach/dialogs/StateChangeDialog",
  component: StateChangeDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof StateChangeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof StateChangeDialog>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <StateChangeDialog {...args} />,
} as unknown as Story;
