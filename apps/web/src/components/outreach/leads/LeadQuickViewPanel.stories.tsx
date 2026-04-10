// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { LeadQuickViewPanel } from "./LeadQuickViewPanel.js";

const meta = {
  title: "Cerniq/outreach/leads/LeadQuickViewPanel",
  component: LeadQuickViewPanel,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof LeadQuickViewPanel>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof LeadQuickViewPanel>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <LeadQuickViewPanel {...args} />,
} as unknown as Story;
