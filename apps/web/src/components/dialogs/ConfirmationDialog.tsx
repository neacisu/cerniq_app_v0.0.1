import type { ReactNode } from "react";
import { Button } from "@/components/ui/button.js";

type Variant = "info" | "danger" | "warning" | "success";

type ConfirmationDialogProps = {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly variant?: Variant;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly extraContent?: ReactNode;
};

const accents: Record<Variant, string> = {
  info: "border-in",
  danger: "border-er",
  warning: "border-wa",
  success: "border-ok",
};

export function ConfirmationDialog({
  open,
  title,
  description,
  variant = "info",
  confirmLabel = "Confirma",
  cancelLabel = "Anuleaza",
  onCancel,
  onConfirm,
  extraContent,
}: Readonly<ConfirmationDialogProps>) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className={`w-full max-w-lg rounded-lg border bg-s900 p-5 ${accents[variant]}`}>
        <h3 className="mb-2 text-lg font-semibold text-t1">{title}</h3>
        {description ? <p className="mb-4 text-sm text-t3">{description}</p> : null}
        {extraContent}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
