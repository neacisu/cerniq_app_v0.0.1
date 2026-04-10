// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { SilverCompanyDrawer } from "./SilverCompanyDrawer.js";

const meta = {
  title: "Cerniq/drawers/SilverCompanyDrawer",
  component: SilverCompanyDrawer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof SilverCompanyDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof SilverCompanyDrawer>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <SilverCompanyDrawer {...args} />,
} as unknown as Story;
