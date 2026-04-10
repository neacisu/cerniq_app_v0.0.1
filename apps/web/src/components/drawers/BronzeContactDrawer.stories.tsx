// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { BronzeContactDrawer } from "./BronzeContactDrawer.js";

const meta = {
  title: "Cerniq/drawers/BronzeContactDrawer",
  component: BronzeContactDrawer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof BronzeContactDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof BronzeContactDrawer>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <BronzeContactDrawer {...args} />,
} as unknown as Story;
