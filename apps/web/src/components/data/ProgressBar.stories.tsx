// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ProgressBar } from "./ProgressBar.js";

const meta = {
  title: "Cerniq/data/ProgressBar",
  component: ProgressBar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ProgressBar>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ProgressBar {...args} />,
} as unknown as Story;
