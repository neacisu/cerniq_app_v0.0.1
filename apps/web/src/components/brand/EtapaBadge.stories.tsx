// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { EtapaBadge } from "./EtapaBadge.js";

const meta = {
  title: "Cerniq/brand/EtapaBadge",
  component: EtapaBadge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof EtapaBadge>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof EtapaBadge>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <EtapaBadge {...args} />,
} as unknown as Story;
