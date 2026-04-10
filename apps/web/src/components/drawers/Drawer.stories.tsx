// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { Drawer } from "./Drawer.js";

const meta = {
  title: "Cerniq/drawers/Drawer",
  component: Drawer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof Drawer>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <Drawer {...args} />,
} as unknown as Story;
