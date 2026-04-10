// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { LayerBadge } from "./LayerBadge.js";

const meta = {
  title: "Cerniq/data/LayerBadge",
  component: LayerBadge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof LayerBadge>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof LayerBadge>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <LayerBadge {...args} />,
} as unknown as Story;
