// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { TabsNav } from "./TabsNav.js";

const meta = {
  title: "Cerniq/navigation/TabsNav",
  component: TabsNav,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof TabsNav>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof TabsNav>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <TabsNav {...args} />,
} as unknown as Story;
