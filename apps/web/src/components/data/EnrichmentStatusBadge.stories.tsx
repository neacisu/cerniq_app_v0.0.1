// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { EnrichmentStatusBadge } from "./EnrichmentStatusBadge.js";

const meta = {
  title: "Cerniq/data/EnrichmentStatusBadge",
  component: EnrichmentStatusBadge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof EnrichmentStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof EnrichmentStatusBadge>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <EnrichmentStatusBadge {...args} />,
} as unknown as Story;
