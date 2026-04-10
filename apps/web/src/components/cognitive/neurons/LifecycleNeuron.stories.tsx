// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { LifecycleNeuronComponent } from "./LifecycleNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/LifecycleNeuron",
  component: LifecycleNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof LifecycleNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof LifecycleNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <LifecycleNeuronComponent {...args} />,
} as unknown as Story;
