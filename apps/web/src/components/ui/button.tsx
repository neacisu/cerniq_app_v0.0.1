import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils.js";

type ButtonVariant =
  | "primary"
  | "outline"
  | "ghost"
  | "brand"
  | "danger"
  | "success";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-b5)] text-[var(--color-s950)] hover:bg-[var(--color-b4)]",
  outline:
    "border border-[var(--color-s600)] text-[var(--color-t1)] hover:bg-[var(--color-s800)]",
  ghost:
    "text-[var(--color-t2)] hover:bg-[var(--color-s800)] hover:text-[var(--color-t1)]",
  brand:
    "bg-[var(--color-b5)] text-[var(--color-s950)] hover:bg-[var(--color-b4)]",
  danger: "bg-[var(--color-er)] text-white hover:opacity-90",
  success: "bg-[var(--color-ok)] text-[var(--color-s950)] hover:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-xs",
  lg: "px-6 py-3 text-base",
  icon: "w-8 h-8 p-0 flex items-center justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "default", disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-all duration-200",
        "focus-visible:outline-2 focus-visible:outline-[var(--color-b5)] focus-visible:outline-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled}
      {...props}
    />
  ),
);
Button.displayName = "Button";
