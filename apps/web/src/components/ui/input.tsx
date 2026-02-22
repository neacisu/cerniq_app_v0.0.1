import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils.js";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("inp", error && "err", className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";
