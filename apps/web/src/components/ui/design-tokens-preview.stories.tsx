import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { DesignTokensPreviewPage } from "./design-tokens-preview.js";

const meta = {
  title: "Cerniq/UI/DesignTokensPreview",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Preview OKLCH / Dark Terroir — aceeași pagină ca `/settings/design-system` (dev).",
      },
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pagina: Story = {
  render: () => <DesignTokensPreviewPage />,
};
