// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { FeedbackNeuronComponent } from "./FeedbackNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/FeedbackNeuron",
  component: FeedbackNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof FeedbackNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof FeedbackNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <FeedbackNeuronComponent {...args} />,
} as unknown as Story;
