// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { FormField } from "./FormField.js";

const meta = {
  title: "Cerniq/forms/FormField",
  component: FormField,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof FormField>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <FormField {...args} />,
} as unknown as Story;
