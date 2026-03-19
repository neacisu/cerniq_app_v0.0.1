import type { ReactNode } from "react";
import { Button } from "@/components/ui/button.js";

type BulkActionBarProps = {
  readonly selectedCount: number;
  readonly onClear: () => void;
  readonly actions?: ReactNode;
};

export function BulkActionBar({ selectedCount, onClear, actions }: BulkActionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="mb-3 flex items-center justify-between rounded-md border border-s600 bg-s800 p-3">
      <span className="text-xs text-t2">{selectedCount} elemente selectate</span>
      <div className="flex items-center gap-2">
        {actions}
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
