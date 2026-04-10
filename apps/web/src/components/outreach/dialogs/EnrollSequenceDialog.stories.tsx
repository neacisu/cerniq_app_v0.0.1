// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { EnrollSequenceDialog } from "./EnrollSequenceDialog.js";

const meta = {
  title: "Cerniq/outreach/dialogs/EnrollSequenceDialog",
  component: EnrollSequenceDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof EnrollSequenceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof EnrollSequenceDialog>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <EnrollSequenceDialog {...args} />,
} as unknown as Story;
