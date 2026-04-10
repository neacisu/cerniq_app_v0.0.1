import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spinner } from "./spinner.js";

const meta = {
  title: "Cerniq/UI/Spinner",
  component: Spinner,
  tags: ["autodocs"],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Mare: Story = {
  args: { size: 40 },
};
