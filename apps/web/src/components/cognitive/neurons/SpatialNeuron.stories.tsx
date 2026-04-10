// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { SpatialNeuronComponent } from "./SpatialNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/SpatialNeuron",
  component: SpatialNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof SpatialNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof SpatialNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <SpatialNeuronComponent {...args} />,
} as unknown as Story;
