// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ChannelIcon } from "./ChannelIcon.js";

const meta = {
  title: "Cerniq/outreach/shared/ChannelIcon",
  component: ChannelIcon,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ChannelIcon>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ChannelIcon>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ChannelIcon {...args} />,
} as unknown as Story;
