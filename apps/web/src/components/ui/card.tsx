import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils.js";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-s700)]",
        "bg-[var(--color-s900)]/80 backdrop-blur-[12px]",
        "hover:border-[var(--color-s600)] transition-colors duration-200",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn("px-5 py-4 border-b border-[var(--color-s700)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h3
      className={cn(
        "text-base font-semibold font-[var(--font-display)] text-[var(--color-t1)]",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardBody({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
}
