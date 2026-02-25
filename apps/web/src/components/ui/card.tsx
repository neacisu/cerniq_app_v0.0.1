import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils.js";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("ch", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h2 className={cn("ct", className)} {...props}>
      {children}
    </h2>
  );
}

export function CardBody({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("cb", className)} {...props}>
      {children}
    </div>
  );
}
