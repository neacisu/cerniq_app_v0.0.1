// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { CompanyDetailsDialog } from "./CompanyDetailsDialog.js";

const meta = {
  title: "Cerniq/dialogs/CompanyDetailsDialog",
  component: CompanyDetailsDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      },
    },
  },
} satisfies Meta<typeof CompanyDetailsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof CompanyDetailsDialog>;

export const Default = {
  name: "Implicit",
  render: (args: Props) => <CompanyDetailsDialog {...args} />,
} as unknown as Story;
