// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { Breadcrumbs } from "./Breadcrumbs.js";

const meta = {
  title: "Cerniq/navigation/Breadcrumbs",
  component: Breadcrumbs,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof Breadcrumbs>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <Breadcrumbs {...args} />,
} as unknown as Story;
