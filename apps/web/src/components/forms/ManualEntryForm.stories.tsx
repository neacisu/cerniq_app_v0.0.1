// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ManualEntryForm } from "./ManualEntryForm.js";

const meta = {
  title: "Cerniq/forms/ManualEntryForm",
  component: ManualEntryForm,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ManualEntryForm>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ManualEntryForm>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ManualEntryForm {...args} />,
} as unknown as Story;
