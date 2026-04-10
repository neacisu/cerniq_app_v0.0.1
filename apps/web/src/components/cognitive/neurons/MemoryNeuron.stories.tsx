// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { MemoryNeuronComponent } from "./MemoryNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/MemoryNeuron",
  component: MemoryNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof MemoryNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof MemoryNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <MemoryNeuronComponent {...args} />,
} as unknown as Story;
