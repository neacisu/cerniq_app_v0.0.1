// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { QueueStatusCard } from "./QueueStatusCard.js";

const meta = {
  title: "Cerniq/data/QueueStatusCard",
  component: QueueStatusCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof QueueStatusCard>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof QueueStatusCard>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <QueueStatusCard {...args} />,
} as unknown as Story;
