import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "./button.js";

const meta = {
  title: "Cerniq/UI/Button",
  component: Button,
  tags: ["autodocs"],
  args: { onClick: fn(), children: "Acțiune" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary", children: "Primary" },
};

export const Outline: Story = {
  args: { variant: "outline", children: "Outline" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "Ghost" },
};

export const Brand: Story = {
  args: { variant: "brand", children: "Brand" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "Șterge" },
};

export const Success: Story = {
  args: { variant: "success", children: "Confirmă" },
};

export const Small: Story = {
  args: { size: "sm", children: "Mic" },
};

export const Large: Story = {
  args: { size: "lg", children: "Mare" },
};
