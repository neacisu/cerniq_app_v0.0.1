import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils.js";

type ButtonVariant = "primary" | "outline" | "ghost" | "brand" | "danger" | "success";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "btp",
  outline: "bto",
  ghost: "btg",
  brand: "btb",
  danger: "btd",
  success: "btok",
};

const sizeClass: Record<ButtonSize, string> = {
  default: "",
  sm: "bsm",
  lg: "blg",
  icon: "bic",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn("btn", variantClass[variant], sizeClass[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
