// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { SendMessageDialog } from "./SendMessageDialog.js";

const meta = {
  title: "Cerniq/outreach/dialogs/SendMessageDialog",
  component: SendMessageDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof SendMessageDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof SendMessageDialog>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <SendMessageDialog {...args} />,
} as unknown as Story;
