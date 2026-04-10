// @ts-nocheck
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./select.js";

const options = [
  { value: "ro", label: "Română" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
];

const meta = {
  title: "Cerniq/UI/Select",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function SelectStory() {
    const [v, setV] = useState<string | undefined>("ro");
    return (
      <div className="max-w-xs">
        <Select options={options} value={v} onValueChange={setV} placeholder="Limbă…" />
      </div>
    );
  },
};

export const Eroare: Story = {
  render: () => (
    <div className="max-w-xs">
      <Select options={options} error placeholder="Select invalid" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="max-w-xs">
      <Select options={options} disabled placeholder="Inactiv" />
    </div>
  ),
};
