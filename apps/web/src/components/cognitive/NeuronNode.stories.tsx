// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { NeuronNodeComponent } from "./NeuronNode.js";

const meta = {
  title: "Cerniq/cognitive/NeuronNode",
  component: NeuronNodeComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof NeuronNodeComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof NeuronNodeComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <NeuronNodeComponent {...args} />,
} as unknown as Story;
