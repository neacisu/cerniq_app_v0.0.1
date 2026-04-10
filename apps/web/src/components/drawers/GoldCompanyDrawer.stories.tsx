// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { GoldCompanyDrawer } from "./GoldCompanyDrawer.js";

const meta = {
  title: "Cerniq/drawers/GoldCompanyDrawer",
  component: GoldCompanyDrawer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof GoldCompanyDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof GoldCompanyDrawer>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <GoldCompanyDrawer {...args} />,
} as unknown as Story;
