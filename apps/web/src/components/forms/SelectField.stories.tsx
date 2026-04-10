// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { SelectField } from "./SelectField.js";

const meta = {
  title: "Cerniq/forms/SelectField",
  component: SelectField,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof SelectField>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof SelectField>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <SelectField {...args} />,
} as unknown as Story;
