import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "./button.js";
import { Toaster } from "./toast.js";
import { toast } from "./toast-api.js";

const meta = {
  title: "Cerniq/UI/Toaster",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <>
        <Toaster />
        <Story />
      </>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Declansator: Story = {
  render: () => (
    <Button
      type="button"
      variant="primary"
      onClick={() => toast.success("Operațiune reușită (Sonner + token-uri tc).")}
    >
      Arată toast
    </Button>
  ),
};

export const Variante: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={() => toast.message("Mesaj neutru")}>
        Message
      </Button>
      <Button type="button" variant="outline" onClick={() => toast.error("Eroare demo")}>
        Error
      </Button>
      <Button type="button" variant="outline" onClick={() => toast.warning("Atenție")}>
        Warning
      </Button>
    </div>
  ),
  parameters: {
    actions: { handles: [fn()] },
  },
};
