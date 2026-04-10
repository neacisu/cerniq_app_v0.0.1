// @ts-nocheck
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, CardHeader, CardTitle, CardBody } from "./card.js";

const meta = {
  title: "Cerniq/UI/Card",
  component: Card,
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Titlu card</CardTitle>
      </CardHeader>
      <CardBody>
        <p className="text-t2 text-sm">Conținut exemplu pentru layout dashboard.</p>
      </CardBody>
    </Card>
  ),
};
