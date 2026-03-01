import { useEffect, type ReactNode } from "react";

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

const BASE_TITLE = "Cerniq";

export function PageWrapper({ title, subtitle, children, actions }: PageWrapperProps) {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);

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
