// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { SocialNeuronComponent } from "./SocialNeuron.js";

const meta = {
  title: "Cerniq/cognitive/neurons/SocialNeuron",
  component: SocialNeuronComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof SocialNeuronComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof SocialNeuronComponent>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <SocialNeuronComponent {...args} />,
} as unknown as Story;
