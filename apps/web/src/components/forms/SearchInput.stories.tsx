// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { SearchInput } from "./SearchInput.js";

const meta = {
  title: "Cerniq/forms/SearchInput",
  component: SearchInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof SearchInput>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <SearchInput {...args} />,
} as unknown as Story;
