// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { LogisticsNeuronComponent } from "./LogisticsNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/LogisticsNeuron",
  component: LogisticsNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof LogisticsNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof LogisticsNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <LogisticsNeuronComponent {...args} />,
} as unknown as Story;
