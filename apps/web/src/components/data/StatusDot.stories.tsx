// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { StatusDot } from "./StatusDot.js";

const meta = {
  title: "Cerniq/data/StatusDot",
  component: StatusDot,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof StatusDot>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof StatusDot>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <StatusDot {...args} />,
} as unknown as Story;
