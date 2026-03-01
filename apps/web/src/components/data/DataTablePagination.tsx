import { Button } from "@/components/ui/button.js";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (nextPage: number) => void;
};

export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);

  return (
    <div className="flex items-center justify-between pt-4">
      <span className="text-xs text-[var(--color-t3)]">
        Pagina {current} din {totalPages} ({total} rezultate)
      </span>
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
