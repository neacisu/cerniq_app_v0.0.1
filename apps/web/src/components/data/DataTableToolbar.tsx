import type { ReactNode } from "react";

type DataTableToolbarProps = {
  readonly title?: string;
  readonly description?: string;
  readonly leftSlot?: ReactNode;
  readonly rightSlot?: ReactNode;
};

export function DataTableToolbar({
  title,
  description,
  leftSlot,
  rightSlot,
}: DataTableToolbarProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="space-y-1">
        {title ? <h3 className="text-sm font-semibold text-t1">{title}</h3> : null}
        {description ? <p className="text-xs text-t3">{description}</p> : null}
        {leftSlot}
      </div>
      <div className="flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}
