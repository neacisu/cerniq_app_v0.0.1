import type { Meta, StoryObj } from "@storybook/react-vite";
import { TableRoot, TableWrapper, Th, Td } from "./table.js";

const meta = {
  title: "Cerniq/UI/Table",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <TableWrapper>
      <TableRoot>
        <thead>
          <tr>
            <Th>Coloană A</Th>
            <Th>Coloană B</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td>1</Td>
            <Td>alpha</Td>
          </tr>
          <tr>
            <Td>2</Td>
            <Td>beta</Td>
          </tr>
        </tbody>
      </TableRoot>
    </TableWrapper>
  ),
};
