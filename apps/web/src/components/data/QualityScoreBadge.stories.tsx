// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { QualityScoreBadge } from "./QualityScoreBadge.js";

const meta = {
  title: "Cerniq/data/QualityScoreBadge",
  component: QualityScoreBadge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof QualityScoreBadge>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof QualityScoreBadge>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <QualityScoreBadge {...args} />,
} as unknown as Story;
