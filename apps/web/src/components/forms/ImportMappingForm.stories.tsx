// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ImportMappingForm } from "./ImportMappingForm.js";

const meta = {
  title: "Cerniq/forms/ImportMappingForm",
  component: ImportMappingForm,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ImportMappingForm>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ImportMappingForm>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ImportMappingForm {...args} />,
} as unknown as Story;
