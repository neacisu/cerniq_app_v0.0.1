import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs.js";

const meta = {
  title: "Cerniq/UI/Tabs",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="a" className="max-w-lg">
      <TabsList>
        <TabsTrigger value="a">Tab A</TabsTrigger>
        <TabsTrigger value="b">Tab B</TabsTrigger>
      </TabsList>
      <TabsContent value="a">
        <p className="text-t2 text-sm">Conținut tab A</p>
      </TabsContent>
      <TabsContent value="b">
        <p className="text-t2 text-sm">Conținut tab B</p>
      </TabsContent>
    </Tabs>
  ),
};
