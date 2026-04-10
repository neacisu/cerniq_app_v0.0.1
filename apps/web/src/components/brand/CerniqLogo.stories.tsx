// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { CerniqLogo } from "./CerniqLogo.js";

const meta = {
  title: "Cerniq/brand/CerniqLogo",
  component: CerniqLogo,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof CerniqLogo>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof CerniqLogo>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <CerniqLogo {...args} />,
} as unknown as Story;
