import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils.js";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full px-3 py-2 rounded-[var(--radius-md)] text-sm",
        "bg-[var(--color-s800)] border border-[var(--color-s600)] text-[var(--color-t1)]",
        "placeholder:text-[var(--color-t3)]",
        "focus:outline-none focus:border-[var(--color-b5)] focus:ring-1 focus:ring-[var(--color-b5)]",
        "transition-colors duration-200",
        error &&
          "border-[var(--color-er)] focus:border-[var(--color-er)] focus:ring-[var(--color-er)]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
