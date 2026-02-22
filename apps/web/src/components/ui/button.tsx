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
    "bg-[var(--color-b5)] text-[oklch(.10_.02_255)] border-[var(--color-b5)] hover:bg-[var(--color-b4)] hover:-translate-y-px hover:shadow-[0_0_16px_oklch(.70_.18_72/25%)]",
  outline:
    "bg-transparent text-[var(--color-t2)] border-[oklch(.28_.018_255)] hover:bg-[oklch(.18_.018_255)] hover:text-[var(--color-t1)] hover:border-[oklch(.34_.018_255)]",
  ghost:
    "bg-transparent text-[var(--color-t2)] border-transparent hover:bg-[oklch(.18_.018_255)] hover:text-[var(--color-t1)]",
  brand:
    "bg-[oklch(.70_.18_72/14%)] text-[oklch(.83_.13_76)] border-[oklch(.70_.18_72/30%)] hover:bg-[oklch(.70_.18_72/22%)]",
  danger:
    "bg-[oklch(.58_.24_27/14%)] text-[oklch(.70_.22_28)] border-[oklch(.58_.24_27/30%)] hover:bg-[oklch(.58_.24_27/22%)]",
  success:
    "bg-[oklch(.60_.22_148/14%)] text-[oklch(.72_.22_148)] border-[oklch(.60_.22_148/30%)] hover:bg-[oklch(.60_.22_148/22%)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-[14px] py-[7px] text-[13px]",
  sm: "px-[10px] py-[5px] text-xs rounded-[6px]",
  lg: "px-5 py-[10px] text-[15px] rounded-[10px]",
  icon: "p-[7px] w-8 h-8",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "default", disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 px-[14px] py-[7px] rounded-lg text-[13px] font-semibold border transition-all duration-[120ms]",
        "focus-visible:outline-2 focus-visible:outline-[var(--color-b5)] focus-visible:outline-offset-2",
        "disabled:opacity-[.55] disabled:cursor-not-allowed disabled:pointer-events-none",
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
