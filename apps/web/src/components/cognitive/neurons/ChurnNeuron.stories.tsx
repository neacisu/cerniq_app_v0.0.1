// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ChurnNeuronComponent } from "./ChurnNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/ChurnNeuron",
  component: ChurnNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ChurnNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ChurnNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ChurnNeuronComponent {...args} />,
} as unknown as Story;
