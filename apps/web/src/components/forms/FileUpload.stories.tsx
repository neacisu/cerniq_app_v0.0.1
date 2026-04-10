// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { FileUpload } from "./FileUpload.js";

const meta = {
  title: "Cerniq/forms/FileUpload",
  component: FileUpload,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof FileUpload>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <FileUpload {...args} />,
} as unknown as Story;
