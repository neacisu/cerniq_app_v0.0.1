// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ConfirmationDialog } from "./ConfirmationDialog.js";

const meta = {
  title: "Cerniq/dialogs/ConfirmationDialog",
  component: ConfirmationDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ConfirmationDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ConfirmationDialog>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ConfirmationDialog {...args} />,
} as unknown as Story;
