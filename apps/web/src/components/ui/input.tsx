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
        "w-full h-[38px] px-3 rounded-lg text-[13.5px] font-[var(--font-body)]",
        "bg-[oklch(.16_.018_256/70%)] border border-[oklch(.26_.018_257/80%)] text-[var(--color-t1)]",
        "placeholder:text-[var(--color-t4)]",
        "focus:outline-none focus:border-[var(--color-b5)] focus:shadow-[0_0_0_3px_oklch(.70_.18_72/18%)]",
        "transition-colors duration-200",
        error &&
          "border-[var(--color-er)] focus:border-[var(--color-er)] focus:shadow-[0_0_0_3px_oklch(.58_.24_27/18%)]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
