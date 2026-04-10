// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { MessageBubble } from "./MessageBubble.js";

const meta = {
  title: "Cerniq/outreach/conversation/MessageBubble",
  component: MessageBubble,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof MessageBubble>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof MessageBubble>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <MessageBubble {...args} />,
} as unknown as Story;
