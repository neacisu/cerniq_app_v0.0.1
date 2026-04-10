// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ToolNeuronComponent } from "./ToolNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/ToolNeuron",
  component: ToolNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ToolNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ToolNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ToolNeuronComponent {...args} />,
} as unknown as Story;
