import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils.js";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-[oklch(.22_.018_255/60%)]",
        "bg-[oklch(.12_.018_255/80%)] backdrop-blur-[12px] overflow-hidden",
        "hover:border-[oklch(.28_.018_255/70%)] transition-colors duration-200",
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
      className={cn(
        "px-[18px] pt-[14px] pb-[12px] border-b border-[oklch(.20_.018_255/50%)] flex items-center justify-between",
        className,
      )}
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
        "text-[14px] font-bold font-[var(--font-display)] text-[var(--color-t1)] tracking-[-.01em]",
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
    <div className={cn("px-[18px] py-[16px]", className)} {...props}>
      {children}
    </div>
  );
}
