import type { ReactNode } from "react";
import { cn } from "@/lib/utils.js";

type FormFieldProps = {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
};

export function FormField({ label, hint, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-sm font-medium text-t1">
        {label}
        {required ? <span className="ml-1 text-er">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-t3">{hint}</p> : null}
      {error ? <p className="text-xs text-er">{error}</p> : null}
    </div>
  );
}
