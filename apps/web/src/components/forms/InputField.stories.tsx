// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { InputField } from "./InputField.js";

const meta = {
  title: "Cerniq/forms/InputField",
  component: InputField,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof InputField>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof InputField>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <InputField {...args} />,
} as unknown as Story;
