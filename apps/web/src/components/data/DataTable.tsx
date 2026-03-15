import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { TableRoot, TableWrapper, Th, Td } from "@/components/ui/table.js";
import { cn } from "@/lib/utils.js";

type DataTableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  emptyMessage?: string;
  className?: string;
};

export function DataTable<TData>({
  columns,
  data,
  emptyMessage = "Nu exista date.",
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const safeData = useMemo(() => data ?? [], [data]);

  // TanStack Table intentionally returns dynamic helpers; this hook is safe here by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: safeData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <TableWrapper className={cn("w-full", className)}>
      <div className="overflow-x-auto">
        <TableRoot className="w-full text-sm" style={{ minWidth: "600px" }}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-s700 text-left text-t3"
            >
              {headerGroup.headers.map((header) => (
                <Th key={header.id} className="px-5 py-3">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-s700 last:border-0 hover:bg-s800/50"
              >
                {row.getVisibleCells().map((cell) => (
                  <Td key={cell.id} className="px-5 py-3 text-t1">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <Td colSpan={columns.length} className="px-5 py-8 text-center text-t3">
                {emptyMessage}
              </Td>
            </tr>
          )}
        </tbody>
        </TableRoot>
      </div>
    </TableWrapper>
  );
}
