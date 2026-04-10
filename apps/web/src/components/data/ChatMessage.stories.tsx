// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ChatMessage } from "./ChatMessage.js";

const meta = {
  title: "Cerniq/data/ChatMessage",
  component: ChatMessage,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ChatMessage>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ChatMessage {...args} />,
} as unknown as Story;
