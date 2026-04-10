// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { EnvironmentNeuronComponent } from "./EnvironmentNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/EnvironmentNeuron",
  component: EnvironmentNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof EnvironmentNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof EnvironmentNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <EnvironmentNeuronComponent {...args} />,
} as unknown as Story;
