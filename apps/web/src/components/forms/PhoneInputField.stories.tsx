// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { PhoneInputField } from "./PhoneInputField.js";

const meta = {
  title: "Cerniq/forms/PhoneInputField",
  component: PhoneInputField,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof PhoneInputField>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof PhoneInputField>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <PhoneInputField {...args} />,
} as unknown as Story;
