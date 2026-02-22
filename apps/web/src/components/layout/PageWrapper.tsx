import type { ReactNode } from "react";
import { cn } from "@/lib/utils.js";

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function PageWrapper({
  title,
  subtitle,
  children,
  className,
  actions,
}: PageWrapperProps) {
  return (
    <div
      className={cn("max-w-[1380px] mx-auto px-6 pt-6 pb-12", className)}
      style={{ animation: "pageIn 0.22s ease both" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-[24px] font-extrabold tracking-[-.03em] leading-[1.2]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          {subtitle && <p className="ps">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
