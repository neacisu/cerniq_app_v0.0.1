import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input.js";

const meta = {
  title: "Cerniq/UI/Input",
  component: Input,
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Introduceți text…",
  },
};

export const CuEroare: Story = {
  args: {
    placeholder: "Email",
    error: true,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "Dezactivat",
    disabled: true,
    defaultValue: "nu se editează",
  },
};
