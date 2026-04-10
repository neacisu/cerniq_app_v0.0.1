// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { BatchSelectorRail } from "./BatchSelectorRail.js";

const meta = {
  title: "Cerniq/cognitive/BatchSelectorRail",
  component: BatchSelectorRail,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof BatchSelectorRail>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof BatchSelectorRail>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <BatchSelectorRail {...args} />,
} as unknown as Story;
