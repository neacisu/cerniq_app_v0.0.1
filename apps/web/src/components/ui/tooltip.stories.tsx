import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tooltip } from "./tooltip.js";
import { Button } from "./button.js";

const meta = {
  title: "Cerniq/UI/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  /** Obligatoriu pentru tipul Storybook (`content` + `children` pe `Tooltip`); story-ul cu `render` propriu definește UI-ul real. */
  args: { content: " ", children: " " },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PeButon: Story = {
  render: () => (
    <Tooltip content="Text ajutător pentru acțiune">
      <Button type="button" variant="outline">
        Hover / focus
      </Button>
    </Tooltip>
  ),
};
