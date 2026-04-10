// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { AppLayout } from "./AppLayout.js";

const meta = {
  title: "Cerniq/layout/AppLayout",
  component: AppLayout,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof AppLayout>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof AppLayout>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <AppLayout {...args} />,
} as unknown as Story;
