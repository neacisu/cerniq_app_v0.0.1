import type { ReactNode } from "react";
import { cn } from "@/lib/utils.js";

type FormFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, hint, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-sm font-medium text-[var(--color-t1)]">
        {label}
        {required ? <span className="ml-1 text-[var(--color-er)]">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-[var(--color-t3)]">{hint}</p> : null}
      {error ? <p className="text-xs text-[var(--color-er)]">{error}</p> : null}
    </div>
  );
}
