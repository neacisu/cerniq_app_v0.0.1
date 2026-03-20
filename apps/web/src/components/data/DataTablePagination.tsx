import { Button } from "@/components/ui/button.js";
import { Select } from "@/components/ui/select.js";

type DataTablePaginationProps = Readonly<{
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (nextPage: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}>;

export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-s700 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-t3">
          Pagina {current} din {totalPages} ({total} rezultate)
        </span>
        {pageSizeOptions && onPageSizeChange && (
          <Select
            value={String(pageSize)}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: `${n} / pagina` }))}
            onValueChange={(val) => {
              onPageSizeChange(Number(val));
            }}
          />
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={current <= 1}
          onClick={() => onPageChange(Math.max(1, current - 1))}
        >
          Inapoi
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={current >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, current + 1))}
        >
          Inainte
        </Button>
      </div>
    </div>
  );
}
