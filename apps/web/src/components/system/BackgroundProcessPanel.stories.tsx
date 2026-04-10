// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { BackgroundProcessPanel } from "./BackgroundProcessPanel.js";

const meta = {
  title: "Cerniq/system/BackgroundProcessPanel",
  component: BackgroundProcessPanel,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof BackgroundProcessPanel>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof BackgroundProcessPanel>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <BackgroundProcessPanel {...args} />,
} as unknown as Story;
