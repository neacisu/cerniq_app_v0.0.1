import type { ReactNode } from "react";
import { Button } from "@/components/ui/button.js";

type Variant = "info" | "danger" | "warning" | "success";

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  variant?: Variant;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  extraContent?: ReactNode;
};

const accents: Record<Variant, string> = {
  info: "border-[var(--color-in)]",
  danger: "border-[var(--color-er)]",
  warning: "border-[var(--color-wa)]",
  success: "border-[var(--color-ok)]",
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
      <div
        className={`w-full max-w-lg rounded-(--radius-lg) border bg-s900 p-5 ${accents[variant]}`}
      >
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
