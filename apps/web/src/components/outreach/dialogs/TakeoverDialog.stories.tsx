// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { TakeoverDialog } from "./TakeoverDialog.js";

const meta = {
  title: "Cerniq/outreach/dialogs/TakeoverDialog",
  component: TakeoverDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof TakeoverDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof TakeoverDialog>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <TakeoverDialog {...args} />,
} as unknown as Story;
