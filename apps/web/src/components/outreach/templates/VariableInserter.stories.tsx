// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { VariableInserter } from "./VariableInserter.js";

const meta = {
  title: "Cerniq/outreach/templates/VariableInserter",
  component: VariableInserter,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof VariableInserter>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof VariableInserter>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <VariableInserter {...args} />,
} as unknown as Story;
