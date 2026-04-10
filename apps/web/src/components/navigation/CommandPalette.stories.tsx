// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { CommandPalette } from "./CommandPalette.js";

const meta = {
  title: "Cerniq/navigation/CommandPalette",
  component: CommandPalette,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof CommandPalette>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <CommandPalette {...args} />,
} as unknown as Story;
