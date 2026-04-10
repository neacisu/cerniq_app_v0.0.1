// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ReconciliationNeuronComponent } from "./ReconciliationNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/ReconciliationNeuron",
  component: ReconciliationNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ReconciliationNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ReconciliationNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ReconciliationNeuronComponent {...args} />,
} as unknown as Story;
