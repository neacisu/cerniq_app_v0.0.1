// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { PageHeader } from "./PageHeader.js";

const meta = {
  title: "Cerniq/navigation/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof PageHeader>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <PageHeader {...args} />,
} as unknown as Story;
