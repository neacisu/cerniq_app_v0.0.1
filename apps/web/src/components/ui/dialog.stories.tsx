import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog, DialogContent } from "./dialog.js";
import { Button } from "./button.js";

const meta = {
  title: "Cerniq/UI/Dialog",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DialogStory() {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <Button type="button" variant="primary" onClick={() => setOpen(true)}>
          Deschide dialog
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            title="Confirmare"
            description="Descriere opțională pentru accesibilitate."
          >
            <p className="text-t2 text-sm">Conținut dialog — închide cu X sau Escape.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Renunță
              </Button>
              <Button type="button" variant="primary" onClick={() => setOpen(false)}>
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  },
};
