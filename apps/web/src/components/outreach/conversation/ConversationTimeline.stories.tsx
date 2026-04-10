// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ConversationTimeline } from "./ConversationTimeline.js";

const meta = {
  title: "Cerniq/outreach/conversation/ConversationTimeline",
  component: ConversationTimeline,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ConversationTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ConversationTimeline>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ConversationTimeline {...args} />,
} as unknown as Story;
