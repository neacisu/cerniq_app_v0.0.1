// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { Header } from "./Header.js";

const meta = {
  title: "Cerniq/layout/Header",
  component: Header,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof Header>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <Header {...args} />,
} as unknown as Story;
