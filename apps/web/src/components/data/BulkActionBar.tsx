import type { ReactNode } from "react";
import { Button } from "@/components/ui/button.js";

type BulkActionBarProps = {
  selectedCount: number;
  onClear: () => void;
  actions?: ReactNode;
};

export function BulkActionBar({ selectedCount, onClear, actions }: BulkActionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="mb-3 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-s600)] bg-[var(--color-s800)] p-3">
      <span className="text-xs text-[var(--color-t2)]">{selectedCount} elemente selectate</span>
      <div className="flex items-center gap-2">
        {actions}
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
