// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { EmptyState } from "./EmptyState.js";

const meta = {
  title: "Cerniq/feedback/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof EmptyState>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <EmptyState {...args} />,
} as unknown as Story;
