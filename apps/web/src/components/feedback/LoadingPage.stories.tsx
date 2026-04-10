// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { LoadingPage } from "./LoadingPage.js";

const meta = {
  title: "Cerniq/feedback/LoadingPage",
  component: LoadingPage,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof LoadingPage>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof LoadingPage>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <LoadingPage {...args} />,
} as unknown as Story;
