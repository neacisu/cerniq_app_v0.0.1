// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ActivityFeed } from "./ActivityFeed.js";

const meta = {
  title: "Cerniq/widgets/ActivityFeed",
  component: ActivityFeed,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof ActivityFeed>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof ActivityFeed>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <ActivityFeed {...args} />,
} as unknown as Story;
