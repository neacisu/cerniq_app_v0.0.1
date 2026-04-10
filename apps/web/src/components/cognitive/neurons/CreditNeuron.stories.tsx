// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { CreditNeuronComponent } from "./CreditNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/CreditNeuron",
  component: CreditNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof CreditNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof CreditNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <CreditNeuronComponent {...args} />,
} as unknown as Story;
