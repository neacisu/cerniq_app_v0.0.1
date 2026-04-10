// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { NotificationBell } from "./NotificationBell.js";

const meta = {
  title: "Cerniq/layout/NotificationBell",
  component: NotificationBell,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof NotificationBell>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof NotificationBell>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <NotificationBell {...args} />,
} as unknown as Story;
