import type { ReactNode } from "react";
import { cn } from "@/lib/utils.js";

interface PageWrapperProps {
  title: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function PageWrapper({
  title,
  children,
  className,
  actions,
}: PageWrapperProps) {
  return (
    <div
      className={cn("max-w-[1380px] mx-auto", className)}
      style={{ animation: "pageIn 0.3s ease-out" }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
