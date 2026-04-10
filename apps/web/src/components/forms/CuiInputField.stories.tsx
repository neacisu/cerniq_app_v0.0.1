// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { CuiInputField } from "./CuiInputField.js";

const meta = {
  title: "Cerniq/forms/CuiInputField",
  component: CuiInputField,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof CuiInputField>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof CuiInputField>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <CuiInputField {...args} />,
} as unknown as Story;
