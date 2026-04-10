// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ContractNeuronComponent } from "./ContractNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/ContractNeuron",
  component: ContractNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ContractNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ContractNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ContractNeuronComponent {...args} />,
} as unknown as Story;
