import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./skeleton.js";

const meta = {
  title: "Cerniq/UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "h-10 w-full max-w-md rounded-md",
  },
};

export const Randuri: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-2">
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-5/6 rounded" />
    </div>
  ),
};
