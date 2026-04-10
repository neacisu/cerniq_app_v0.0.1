import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "./separator.js";

const meta = {
  title: "Cerniq/UI/Separator",
  component: Separator,
  tags: ["autodocs"],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Orizontal: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <p className="text-t2">Secțiunea A</p>
      <Separator />
      <p className="text-t2">Secțiunea B</p>
    </div>
  ),
};
