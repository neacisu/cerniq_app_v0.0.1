// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { LeadStateHistory } from "./LeadStateHistory.js";

const meta = {
  title: "Cerniq/outreach/leads/LeadStateHistory",
  component: LeadStateHistory,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof LeadStateHistory>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof LeadStateHistory>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <LeadStateHistory {...args} />,
} as unknown as Story;
