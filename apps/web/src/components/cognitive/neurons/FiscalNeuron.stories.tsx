// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { FiscalNeuronComponent } from "./FiscalNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/FiscalNeuron",
  component: FiscalNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof FiscalNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof FiscalNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <FiscalNeuronComponent {...args} />,
} as unknown as Story;
