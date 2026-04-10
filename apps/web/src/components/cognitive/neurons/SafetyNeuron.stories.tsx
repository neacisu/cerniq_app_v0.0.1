// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { SafetyNeuronComponent } from "./SafetyNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/SafetyNeuron",
  component: SafetyNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof SafetyNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof SafetyNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <SafetyNeuronComponent {...args} />,
} as unknown as Story;
