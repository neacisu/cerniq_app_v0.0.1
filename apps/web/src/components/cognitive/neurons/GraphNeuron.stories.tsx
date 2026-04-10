// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { GraphNeuronComponent } from "./GraphNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/GraphNeuron",
  component: GraphNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof GraphNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof GraphNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <GraphNeuronComponent {...args} />,
} as unknown as Story;
