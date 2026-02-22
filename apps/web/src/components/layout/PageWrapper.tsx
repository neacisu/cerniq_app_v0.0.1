import type { ReactNode } from "react";

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PageWrapper({
  title,
  subtitle,
  children,
  actions,
}: PageWrapperProps) {
  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1 className="ptl">{title}</h1>
          {subtitle && <p className="ps">{subtitle}</p>}
        </div>
        {actions && <div className="pa">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
