// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { GuardrailNeuronComponent } from "./GuardrailNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/GuardrailNeuron",
  component: GuardrailNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof GuardrailNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof GuardrailNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <GuardrailNeuronComponent {...args} />,
} as unknown as Story;
