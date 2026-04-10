// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { PipelineProgressPanel } from "./PipelineProgressPanel.js";

const meta = {
  title: "Cerniq/etapa1/PipelineProgressPanel",
  component: PipelineProgressPanel,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof PipelineProgressPanel>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof PipelineProgressPanel>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <PipelineProgressPanel {...args} />,
} as unknown as Story;
