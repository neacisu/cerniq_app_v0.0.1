import type { ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs.js";

type PageHeaderProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly actions?: ReactNode;
  readonly breadcrumbs?: readonly { readonly label: string; readonly to?: string }[];
};

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-5 space-y-2">
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-t1">{title}</h1>
          {subtitle ? <p className="text-sm text-t3">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
