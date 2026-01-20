# CERNIQ.APP — ETAPA 3: UI TABLES SPECIFICATION
## Complete Table Components for AI Sales Agent Module
### Versiunea 1.0 | 19 Ianuarie 2026

---

# TABLE OF CONTENTS

1. [Table Architecture Overview](#1-table-architecture-overview)
2. [Products Table](#2-products-table)
3. [Conversations Table](#3-conversations-table)
4. [Negotiations Table](#4-negotiations-table)
5. [Offers Table](#5-offers-table)
6. [Orders Table](#6-orders-table)
7. [Fiscal Documents Table](#7-fiscal-documents-table)
8. [HITL Approvals Table](#8-hitl-approvals-table)
9. [AI Sessions Table](#9-ai-sessions-table)
10. [Audit Logs Table](#10-audit-logs-table)
11. [Performance Metrics Table](#11-performance-metrics-table)
12. [Shared Table Components](#12-shared-table-components)
13. [Table State Management](#13-table-state-management)
14. [Accessibility & Internationalization](#14-accessibility--internationalization)

---

# 1. TABLE ARCHITECTURE OVERVIEW

## 1.1 Design Principles

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TABLE ARCHITECTURE LAYERS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    DataTable Component                       │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │ TableHeader: Sorting, Filtering, Column Selection   │    │   │
│  │  ├─────────────────────────────────────────────────────┤    │   │
│  │  │ TableBody: Virtualized Rows, Selection, Actions     │    │   │
│  │  ├─────────────────────────────────────────────────────┤    │   │
│  │  │ TableFooter: Pagination, Bulk Actions, Summary      │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────────────────────┴───────────────────────────────┐     │
│  │                    Table State Manager                     │     │
│  │  • Sorting State    • Filter State    • Selection State   │     │
│  │  • Pagination       • Column Visibility • Row Expansion   │     │
│  └───────────────────────────────────────────────────────────┘     │
│                              │                                      │
│  ┌───────────────────────────┴───────────────────────────────┐     │
│  │                    Data Source Layer                       │     │
│  │  • TanStack Query   • Server-Side Pagination              │     │
│  │  • Real-time Updates • Optimistic Updates                 │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 1.2 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Table Core | TanStack Table | 8.20.6 |
| Virtualization | @tanstack/react-virtual | 3.13.6 |
| Data Fetching | TanStack Query | 5.77.0 |
| UI Components | Shadcn/ui | Latest |
| Icons | Lucide React | 0.511.0 |
| Date Handling | date-fns | 4.1.0 |
| Number Formatting | Intl.NumberFormat | Native |

## 1.3 Base Table Component

```typescript
// src/components/ui/data-table/DataTable.tsx
import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTablePagination } from './DataTablePagination';
import { DataTableViewOptions } from './DataTableViewOptions';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  error?: Error | null;
  
  // Pagination
  pageCount?: number;
  pageSize?: number;
  pageIndex?: number;
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
  manualPagination?: boolean;
  
  // Sorting
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  manualSorting?: boolean;
  
  // Filtering
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (filter: string) => void;
  manualFiltering?: boolean;
  
  // Selection
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  enableRowSelection?: boolean | ((row: TData) => boolean);
  
  // Column visibility
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  
  // Row expansion
  enableRowExpansion?: boolean;
  renderExpandedRow?: (row: TData) => React.ReactNode;
  
  // Virtualization
  enableVirtualization?: boolean;
  estimatedRowHeight?: number;
  overscan?: number;
  
  // Actions
  onRowClick?: (row: TData) => void;
  onRowDoubleClick?: (row: TData) => void;
  bulkActions?: BulkAction<TData>[];
  
  // Customization
  emptyMessage?: string;
  className?: string;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  stickyHeader?: boolean;
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  
  // Accessibility
  caption?: string;
  ariaLabel?: string;
  
  // Real-time updates
  highlightNewRows?: boolean;
  newRowIds?: Set<string>;
  getRowId?: (row: TData) => string;
}

export interface BulkAction<TData> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline';
  disabled?: boolean | ((selectedRows: TData[]) => boolean);
  onAction: (selectedRows: TData[]) => void | Promise<void>;
  confirmMessage?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  error = null,
  
  // Pagination
  pageCount,
  pageSize = 20,
  pageIndex = 0,
  onPaginationChange,
  manualPagination = false,
  
  // Sorting
  sorting: controlledSorting,
  onSortingChange,
  manualSorting = false,
  
  // Filtering
  columnFilters: controlledFilters,
  onColumnFiltersChange,
  globalFilter: controlledGlobalFilter,
  onGlobalFilterChange,
  manualFiltering = false,
  
  // Selection
  rowSelection: controlledSelection,
  onRowSelectionChange,
  enableRowSelection = false,
  
  // Column visibility
  columnVisibility: controlledVisibility,
  onColumnVisibilityChange,
  
  // Row expansion
  enableRowExpansion = false,
  renderExpandedRow,
  
  // Virtualization
  enableVirtualization = false,
  estimatedRowHeight = 52,
  overscan = 5,
  
  // Actions
  onRowClick,
  onRowDoubleClick,
  bulkActions = [],
  
  // Customization
  emptyMessage = 'Nu există date de afișat.',
  className,
  toolbar,
  footer,
  stickyHeader = true,
  striped = false,
  bordered = false,
  compact = false,
  
  // Accessibility
  caption,
  ariaLabel,
  
  // Real-time
  highlightNewRows = false,
  newRowIds = new Set(),
  getRowId,
}: DataTableProps<TData, TValue>) {
  // ---------------------------------------------------------------------------
  // Internal State (for uncontrolled mode)
  // ---------------------------------------------------------------------------
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalFilters, setInternalFilters] = useState<ColumnFiltersState>([]);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('');
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>({});
  const [internalVisibility, setInternalVisibility] = useState<VisibilityState>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Use controlled or internal state
  const sorting = controlledSorting ?? internalSorting;
  const columnFilters = controlledFilters ?? internalFilters;
  const globalFilter = controlledGlobalFilter ?? internalGlobalFilter;
  const rowSelection = controlledSelection ?? internalSelection;
  const columnVisibility = controlledVisibility ?? internalVisibility;

  // ---------------------------------------------------------------------------
  // Table Instance
  // ---------------------------------------------------------------------------
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      columnVisibility,
    },
    
    // Pagination
    pageCount: manualPagination ? pageCount : undefined,
    manualPagination,
    
    // Sorting
    manualSorting,
    onSortingChange: onSortingChange ?? setInternalSorting,
    
    // Filtering
    manualFiltering,
    onColumnFiltersChange: onColumnFiltersChange ?? setInternalFilters,
    onGlobalFilterChange: onGlobalFilterChange ?? setInternalGlobalFilter,
    
    // Selection
    enableRowSelection,
    onRowSelectionChange: onRowSelectionChange ?? setInternalSelection,
    
    // Column visibility
    onColumnVisibilityChange: onColumnVisibilityChange ?? setInternalVisibility,
    
    // Row ID
    getRowId: getRowId ?? ((row, index) => (row as any).id ?? String(index)),
    
    // Row models
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // ---------------------------------------------------------------------------
  // Virtualization
  // ---------------------------------------------------------------------------
  const parentRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      virtualizer.measure();
    }
  }, []);

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: enableVirtualization ? rows.length : 0,
    getScrollElement: () => document.querySelector('[data-table-scroll]') as HTMLElement,
    estimateSize: () => estimatedRowHeight,
    overscan,
  });

  const virtualRows = enableVirtualization ? virtualizer.getVirtualItems() : [];
  const totalSize = enableVirtualization ? virtualizer.getTotalSize() : 0;

  // ---------------------------------------------------------------------------
  // Selected Rows
  // ---------------------------------------------------------------------------
  const selectedRows = useMemo(() => {
    return table.getSelectedRowModel().rows.map(row => row.original);
  }, [table.getSelectedRowModel().rows]);

  // ---------------------------------------------------------------------------
  // Row Expansion Toggle
  // ---------------------------------------------------------------------------
  const toggleRowExpansion = useCallback((rowId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Render Loading State
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {toolbar}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((_, index) => (
                  <TableHead key={index}>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: pageSize }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render Error State
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        {toolbar}
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-8 text-center">
          <p className="text-destructive font-medium">
            Eroare la încărcarea datelor
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render Main Table
  // ---------------------------------------------------------------------------
  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      {toolbar ?? (
        <DataTableToolbar
          table={table}
          globalFilter={globalFilter}
          onGlobalFilterChange={onGlobalFilterChange ?? setInternalGlobalFilter}
          selectedCount={selectedRows.length}
          bulkActions={bulkActions}
          selectedRows={selectedRows}
        />
      )}

      {/* Table Container */}
      <div
        className={cn(
          'rounded-md border',
          bordered && 'border-2',
          enableVirtualization && 'overflow-auto max-h-[600px]'
        )}
        data-table-scroll
        ref={enableVirtualization ? parentRef : undefined}
      >
        <Table
          className={cn(
            compact && 'text-sm',
            stickyHeader && '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background'
          )}
        >
          {/* Caption for accessibility */}
          {caption && <caption className="sr-only">{caption}</caption>}

          {/* Header */}
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn(
                      'whitespace-nowrap',
                      header.column.getCanSort() && 'cursor-pointer select-none'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    aria-sort={
                      header.column.getIsSorted()
                        ? header.column.getIsSorted() === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          {/* Body */}
          <TableBody>
            {enableVirtualization ? (
              // Virtualized rows
              <>
                {virtualRows.length > 0 && (
                  <tr style={{ height: `${virtualRows[0]?.start ?? 0}px` }} />
                )}
                {virtualRows.map(virtualRow => {
                  const row = rows[virtualRow.index];
                  const rowId = row.id;
                  const isExpanded = expandedRows[rowId];
                  const isNew = highlightNewRows && newRowIds.has(rowId);

                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className={cn(
                        striped && virtualRow.index % 2 === 1 && 'bg-muted/50',
                        onRowClick && 'cursor-pointer',
                        isNew && 'animate-pulse bg-primary/10'
                      )}
                      onClick={() => onRowClick?.(row.original)}
                      onDoubleClick={() => onRowDoubleClick?.(row.original)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          className={cn(compact && 'py-2')}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                {virtualRows.length > 0 && (
                  <tr
                    style={{
                      height: `${totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)}px`,
                    }}
                  />
                )}
              </>
            ) : (
              // Non-virtualized rows
              rows.length > 0 ? (
                rows.map((row, index) => {
                  const rowId = row.id;
                  const isExpanded = expandedRows[rowId];
                  const isNew = highlightNewRows && newRowIds.has(rowId);

                  return (
                    <>
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className={cn(
                          striped && index % 2 === 1 && 'bg-muted/50',
                          onRowClick && 'cursor-pointer hover:bg-muted/50',
                          isNew && 'animate-pulse bg-primary/10'
                        )}
                        onClick={() => onRowClick?.(row.original)}
                        onDoubleClick={() => onRowDoubleClick?.(row.original)}
                      >
                        {row.getVisibleCells().map(cell => (
                          <TableCell
                            key={cell.id}
                            className={cn(compact && 'py-2')}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      
                      {/* Expanded Row Content */}
                      {enableRowExpansion && isExpanded && renderExpandedRow && (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="bg-muted/30 p-4"
                          >
                            {renderExpandedRow(row.original)}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination / Footer */}
      {footer ?? (
        <DataTablePagination
          table={table}
          pageSize={pageSize}
          pageIndex={pageIndex}
          pageCount={pageCount ?? table.getPageCount()}
          onPaginationChange={onPaginationChange}
          selectedCount={selectedRows.length}
          totalCount={manualPagination ? undefined : data.length}
        />
      )}
    </div>
  );
}
```

## 1.4 DataTable Toolbar Component

```typescript
// src/components/ui/data-table/DataTableToolbar.tsx
import { Table } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Search, X, ChevronDown, Loader2 } from 'lucide-react';
import { DataTableViewOptions } from './DataTableViewOptions';
import { DataTableFacetedFilter } from './DataTableFacetedFilter';
import { useState } from 'react';
import { BulkAction } from './DataTable';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  selectedCount: number;
  bulkActions: BulkAction<TData>[];
  selectedRows: TData[];
  searchPlaceholder?: string;
  facetedFilters?: FacetedFilter[];
}

interface FacetedFilter {
  columnId: string;
  title: string;
  options: { label: string; value: string; icon?: React.ReactNode }[];
}

export function DataTableToolbar<TData>({
  table,
  globalFilter,
  onGlobalFilterChange,
  selectedCount,
  bulkActions,
  selectedRows,
  searchPlaceholder = 'Caută...',
  facetedFilters = [],
}: DataTableToolbarProps<TData>) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0;

  const handleBulkAction = async (action: BulkAction<TData>) => {
    if (action.confirmMessage) {
      return; // Handled by AlertDialog
    }
    
    setIsProcessing(action.id);
    try {
      await action.onAction(selectedRows);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left side: Search and Filters */}
      <div className="flex flex-1 items-center gap-2">
        {/* Global Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            className="pl-8 pr-8"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
              onClick={() => onGlobalFilterChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Faceted Filters */}
        {facetedFilters.map((filter) => (
          <DataTableFacetedFilter
            key={filter.columnId}
            column={table.getColumn(filter.columnId)}
            title={filter.title}
            options={filter.options}
          />
        ))}

        {/* Reset Filters */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              onGlobalFilterChange('');
            }}
            className="h-8 px-2 lg:px-3"
          >
            Resetează
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Right side: Bulk Actions and View Options */}
      <div className="flex items-center gap-2">
        {/* Bulk Actions */}
        {selectedCount > 0 && bulkActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {selectedCount} selectate
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {bulkActions.map((action) => {
                const isDisabled =
                  typeof action.disabled === 'function'
                    ? action.disabled(selectedRows)
                    : action.disabled;

                if (action.confirmMessage) {
                  return (
                    <AlertDialog key={action.id}>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          disabled={isDisabled}
                          onSelect={(e) => e.preventDefault()}
                          className={
                            action.variant === 'destructive'
                              ? 'text-destructive focus:text-destructive'
                              : ''
                          }
                        >
                          {action.icon}
                          <span className="ml-2">{action.label}</span>
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmare</AlertDialogTitle>
                          <AlertDialogDescription>
                            {action.confirmMessage}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anulează</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              setIsProcessing(action.id);
                              try {
                                await action.onAction(selectedRows);
                              } finally {
                                setIsProcessing(null);
                              }
                            }}
                            className={
                              action.variant === 'destructive'
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                : ''
                            }
                          >
                            {isProcessing === action.id && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Confirmă
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  );
                }

                return (
                  <DropdownMenuItem
                    key={action.id}
                    disabled={isDisabled || isProcessing === action.id}
                    onClick={() => handleBulkAction(action)}
                    className={
                      action.variant === 'destructive'
                        ? 'text-destructive focus:text-destructive'
                        : ''
                    }
                  >
                    {isProcessing === action.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      action.icon
                    )}
                    <span className="ml-2">{action.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* View Options */}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
```

## 1.5 DataTable Pagination Component

```typescript
// src/components/ui/data-table/DataTablePagination.tsx
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSize: number;
  pageIndex: number;
  pageCount: number;
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
  selectedCount: number;
  totalCount?: number;
  pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
  table,
  pageSize,
  pageIndex,
  pageCount,
  onPaginationChange,
  selectedCount,
  totalCount,
  pageSizeOptions = [10, 20, 30, 50, 100],
}: DataTablePaginationProps<TData>) {
  const handlePageChange = (newPageIndex: number) => {
    if (onPaginationChange) {
      onPaginationChange({ pageIndex: newPageIndex, pageSize });
    } else {
      table.setPageIndex(newPageIndex);
    }
  };

  const handlePageSizeChange = (newPageSize: string) => {
    const size = Number(newPageSize);
    if (onPaginationChange) {
      onPaginationChange({ pageIndex: 0, pageSize: size });
    } else {
      table.setPageSize(size);
    }
  };

  const currentPage = pageIndex + 1;
  const canGoPrevious = pageIndex > 0;
  const canGoNext = pageIndex < pageCount - 1;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Selection info */}
      <div className="text-sm text-muted-foreground">
        {selectedCount > 0 ? (
          <span>
            {selectedCount} din {totalCount ?? table.getFilteredRowModel().rows.length} rând(uri) selectat(e)
          </span>
        ) : (
          <span>
            {totalCount ?? table.getFilteredRowModel().rows.length} rânduri total
          </span>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Rânduri pe pagină
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page indicator */}
        <div className="flex items-center justify-center text-sm font-medium whitespace-nowrap">
          Pagina {currentPage} din {pageCount || 1}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(0)}
            disabled={!canGoPrevious}
            aria-label="Prima pagină"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(pageIndex - 1)}
            disabled={!canGoPrevious}
            aria-label="Pagina anterioară"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(pageIndex + 1)}
            disabled={!canGoNext}
            aria-label="Pagina următoare"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(pageCount - 1)}
            disabled={!canGoNext}
            aria-label="Ultima pagină"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## 1.6 DataTable View Options

```typescript
// src/components/ui/data-table/DataTableViewOptions.tsx
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Vizualizare
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Coloane vizibile</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== 'undefined' && column.getCanHide()
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.columnDef.meta?.title ?? column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## 1.7 DataTable Faceted Filter

```typescript
// src/components/ui/data-table/DataTableFacetedFilter.tsx
import { Column } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: React.ReactNode;
  }[];
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selectate
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>Nu s-au găsit rezultate.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = Array.from(selectedValues);
                      column?.setFilterValue(
                        filterValues.length ? filterValues : undefined
                      );
                    }}
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className={cn('h-4 w-4')} />
                    </div>
                    {option.icon}
                    <span>{option.label}</span>
                    {facets?.get(option.value) && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {facets.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center"
                  >
                    Șterge filtrele
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

## 1.8 Column Header Component

```typescript
// src/components/ui/data-table/DataTableColumnHeader.tsx
import { Column } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowDown, ArrowUp, ArrowUpDown, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Crescător
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Descrescător
          </DropdownMenuItem>
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                Ascunde
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

---

# 2. PRODUCTS TABLE

## 2.1 Products Table Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTS TABLE                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Caută produse...]  [Categorie ▼]  [Status ▼]  [Stoc ▼]  [⚙️ Vizualizare]│
├──────────────────────────────────────────────────────────────────────────────┤
│ ☑ │ Imagine │ Nume Produs     │ SKU      │ Categorie │ Preț    │ Stoc │ St │
├───┼─────────┼─────────────────┼──────────┼───────────┼─────────┼──────┼────┤
│ ☐ │ [img]   │ Fertilizant NPK │ FRT-001  │ Fertiliz. │ 450 RON │ 1250 │ 🟢 │
│ ☐ │ [img]   │ Semințe Grâu    │ SEM-042  │ Semințe   │ 320 RON │ 45   │ 🟡 │
│ ☐ │ [img]   │ Pesticid Bio    │ PES-103  │ Pesticide │ 890 RON │ 0    │ 🔴 │
│ ☐ │ [img]   │ Irigație Picur. │ IRG-055  │ Irigații  │ 1250RON │ 234  │ 🟢 │
│ ☐ │ [img]   │ Tractor Mini    │ UTL-007  │ Utilaje   │ 45000   │ 12   │ 🟢 │
├──────────────────────────────────────────────────────────────────────────────┤
│ 5 din 1,234 produse                    Rânduri: [20▼]  Pagina 1 din 62 [◀▶] │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Products Table Implementation

```typescript
// src/features/products/components/ProductsTable.tsx
import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { DataTable, BulkAction } from '@/components/ui/data-table/DataTable';
import { DataTableColumnHeader } from '@/components/ui/data-table/DataTableColumnHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MoreHorizontal, 
  Edit, 
  Copy, 
  Trash2, 
  Eye, 
  Package,
  Archive,
  Download,
  Upload,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Product, ProductStatus, ProductCategory } from '@/types/product';
import { productsApi } from '@/api/products';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ProductsTableProps {
  tenantId: string;
  onEdit?: (product: Product) => void;
  onView?: (product: Product) => void;
}

interface ProductsQueryParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  category?: string[];
  status?: ProductStatus[];
  stockLevel?: 'in_stock' | 'low_stock' | 'out_of_stock';
}

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const statusConfig = {
    active: { label: 'Activ', variant: 'default' as const, className: 'bg-green-500' },
    inactive: { label: 'Inactiv', variant: 'secondary' as const, className: '' },
    draft: { label: 'Draft', variant: 'outline' as const, className: '' },
    archived: { label: 'Arhivat', variant: 'secondary' as const, className: 'bg-gray-400' },
    discontinued: { label: 'Întrerupt', variant: 'destructive' as const, className: '' },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

// =============================================================================
// STOCK LEVEL INDICATOR
// =============================================================================

function StockLevelIndicator({ quantity, lowStockThreshold = 50 }: { 
  quantity: number; 
  lowStockThreshold?: number;
}) {
  if (quantity === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        <span className="text-red-600 font-medium">Stoc epuizat</span>
      </div>
    );
  }
  
  if (quantity <= lowStockThreshold) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        <span className="text-yellow-600 font-medium">{formatNumber(quantity)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      <span className="text-green-600 font-medium">{formatNumber(quantity)}</span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProductsTable({ tenantId, onEdit, onView }: ProductsTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Table State
  // ---------------------------------------------------------------------------
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: false }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [rowSelection, setRowSelection] = useState({});

  // ---------------------------------------------------------------------------
  // Query Parameters
  // ---------------------------------------------------------------------------
  const queryParams: ProductsQueryParams = useMemo(() => ({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sortBy: sorting[0]?.id,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    search: globalFilter || undefined,
    category: columnFilters.find(f => f.id === 'category')?.value as string[] | undefined,
    status: columnFilters.find(f => f.id === 'status')?.value as ProductStatus[] | undefined,
  }), [pagination, sorting, globalFilter, columnFilters]);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', tenantId, queryParams],
    queryFn: () => productsApi.getProducts(tenantId, queryParams),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const deleteMutation = useMutation({
    mutationFn: (productIds: string[]) => 
      productsApi.deleteProducts(tenantId, productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
      setRowSelection({});
      toast({
        title: 'Produse șterse',
        description: 'Produsele selectate au fost șterse cu succes.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut șterge produsele.',
        variant: 'destructive',
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (productIds: string[]) =>
      productsApi.archiveProducts(tenantId, productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
      setRowSelection({});
      toast({
        title: 'Produse arhivate',
        description: 'Produsele selectate au fost arhivate.',
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: (productIds: string[]) =>
      productsApi.exportProducts(tenantId, productIds),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-export-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: 'Export completat',
        description: 'Fișierul a fost descărcat.',
      });
    },
  });

  // ---------------------------------------------------------------------------
  // Column Definitions
  // ---------------------------------------------------------------------------
  const columns: ColumnDef<Product>[] = useMemo(() => [
    // Selection column
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selectează toate"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Selectează rând"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    
    // Image column
    {
      accessorKey: 'imageUrl',
      header: '',
      cell: ({ row }) => (
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={row.original.imageUrl} 
            alt={row.original.name}
          />
          <AvatarFallback>
            <Package className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      ),
      enableSorting: false,
      size: 60,
    },

    // Name column
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nume Produs" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          {row.original.description && (
            <span className="text-sm text-muted-foreground line-clamp-1">
              {row.original.description}
            </span>
          )}
        </div>
      ),
      meta: { title: 'Nume Produs' },
      size: 250,
    },

    // SKU column
    {
      accessorKey: 'sku',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="SKU" />
      ),
      cell: ({ row }) => (
        <code className="text-sm bg-muted px-2 py-1 rounded">
          {row.original.sku}
        </code>
      ),
      meta: { title: 'SKU' },
      size: 120,
    },

    // Category column
    {
      accessorKey: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categorie" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.category}</Badge>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      meta: { title: 'Categorie' },
      size: 130,
    },

    // Price column
    {
      accessorKey: 'price',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Preț" />
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.price, 'RON')}
        </div>
      ),
      meta: { title: 'Preț' },
      size: 100,
    },

    // Stock column
    {
      accessorKey: 'stockQuantity',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stoc" />
      ),
      cell: ({ row }) => (
        <StockLevelIndicator 
          quantity={row.original.stockQuantity}
          lowStockThreshold={row.original.lowStockThreshold}
        />
      ),
      meta: { title: 'Stoc' },
      size: 120,
    },

    // Status column
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <ProductStatusBadge status={row.original.status} />
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      meta: { title: 'Status' },
      size: 100,
    },

    // Actions column
    {
      id: 'actions',
      cell: ({ row }) => {
        const product = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Deschide meniu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView?.(product)}>
                <Eye className="mr-2 h-4 w-4" />
                Vizualizare
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(product)}>
                <Edit className="mr-2 h-4 w-4" />
                Editare
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(product.sku)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiază SKU
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => archiveMutation.mutate([product.id])}
              >
                <Archive className="mr-2 h-4 w-4" />
                Arhivează
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => deleteMutation.mutate([product.id])}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Șterge
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ], [onEdit, onView, archiveMutation, deleteMutation]);

  // ---------------------------------------------------------------------------
  // Bulk Actions
  // ---------------------------------------------------------------------------
  const bulkActions: BulkAction<Product>[] = useMemo(() => [
    {
      id: 'export',
      label: 'Exportă',
      icon: <Download className="h-4 w-4" />,
      onAction: (rows) => exportMutation.mutate(rows.map(r => r.id)),
    },
    {
      id: 'archive',
      label: 'Arhivează',
      icon: <Archive className="h-4 w-4" />,
      onAction: (rows) => archiveMutation.mutate(rows.map(r => r.id)),
      confirmMessage: 'Sigur doriți să arhivați produsele selectate?',
    },
    {
      id: 'delete',
      label: 'Șterge',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onAction: (rows) => deleteMutation.mutate(rows.map(r => r.id)),
      confirmMessage: 'Sigur doriți să ștergeți definitiv produsele selectate? Această acțiune nu poate fi anulată.',
    },
  ], [exportMutation, archiveMutation, deleteMutation]);

  // ---------------------------------------------------------------------------
  // Faceted Filters
  // ---------------------------------------------------------------------------
  const facetedFilters = useMemo(() => [
    {
      columnId: 'category',
      title: 'Categorie',
      options: [
        { label: 'Fertilizanți', value: 'fertilizers' },
        { label: 'Semințe', value: 'seeds' },
        { label: 'Pesticide', value: 'pesticides' },
        { label: 'Irigații', value: 'irrigation' },
        { label: 'Utilaje', value: 'equipment' },
        { label: 'Accesorii', value: 'accessories' },
      ],
    },
    {
      columnId: 'status',
      title: 'Status',
      options: [
        { label: 'Activ', value: 'active' },
        { label: 'Inactiv', value: 'inactive' },
        { label: 'Draft', value: 'draft' },
        { label: 'Arhivat', value: 'archived' },
      ],
    },
  ], []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <DataTable
      columns={columns}
      data={data?.products ?? []}
      isLoading={isLoading}
      error={error}
      
      // Pagination
      pageCount={data?.totalPages ?? 0}
      pageSize={pagination.pageSize}
      pageIndex={pagination.pageIndex}
      onPaginationChange={setPagination}
      manualPagination
      
      // Sorting
      sorting={sorting}
      onSortingChange={setSorting}
      manualSorting
      
      // Filtering
      columnFilters={columnFilters}
      onColumnFiltersChange={setColumnFilters}
      globalFilter={globalFilter}
      onGlobalFilterChange={setGlobalFilter}
      manualFiltering
      
      // Selection
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      enableRowSelection
      
      // Actions
      onRowClick={(product) => navigate(`/products/${product.id}`)}
      bulkActions={bulkActions}
      
      // Customization
      emptyMessage="Nu există produse. Adăugați primul produs pentru a începe."
      striped
      caption="Tabel produse"
      ariaLabel="Lista produselor"
      getRowId={(row) => row.id}
    />
  );
}
```

## 2.3 Product Table Types

```typescript
// src/types/product.ts
export type ProductStatus = 'active' | 'inactive' | 'draft' | 'archived' | 'discontinued';

export type ProductCategory = 
  | 'fertilizers' 
  | 'seeds' 
  | 'pesticides' 
  | 'irrigation' 
  | 'equipment' 
  | 'accessories'
  | 'other';

export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  category: ProductCategory;
  subcategory?: string;
  price: number;
  currency: string;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
  status: ProductStatus;
  imageUrl?: string;
  images?: string[];
  specifications?: Record<string, string>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

---

# 3. CONVERSATIONS TABLE

## 3.1 Conversations Table Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       CONVERSATIONS TABLE                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Caută...]  [Canal ▼]  [Status ▼]  [Agent ▼]  [Dată ▼]  [⚙️ Vizualizare] │
├──────────────────────────────────────────────────────────────────────────────┤
│ │ Contact        │ Canal  │ Ultimul Mesaj      │ Sentiment │ Agent │ Status │
├─┼────────────────┼────────┼────────────────────┼───────────┼───────┼────────┤
│ │ Ion Popescu    │ 📧     │ Vreau ofertă pt... │ 😊 Pozit  │ AI    │ 🟢 Act │
│ │ SC Agro SRL    │ 💬 WA  │ Am primit factura  │ 😐 Neutru │ Human │ ⏸️ Wait│
│ │ Maria Ionescu  │ 📧     │ Nu înțeleg prețul  │ 😟 Negat  │ AI    │ 🔴 Esc │
│ │ Ferma Verde    │ 🌐 Web │ Mulțumesc pentru   │ 😊 Pozit  │ AI    │ ✅ Done│
│ │ Coop Dunărea   │ 📞     │ Când livrați?      │ 😐 Neutru │ AI    │ 🟢 Act │
├──────────────────────────────────────────────────────────────────────────────┤
│ 5 din 892 conversații                  Rânduri: [20▼]  Pagina 1 din 45 [◀▶] │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Conversations Table Implementation

```typescript
// src/features/conversations/components/ConversationsTable.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { DataTableColumnHeader } from '@/components/ui/data-table/DataTableColumnHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MoreHorizontal,
  MessageSquare,
  Mail,
  Phone,
  Globe,
  User,
  Bot,
  AlertTriangle,
  CheckCircle,
  Clock,
  Pause,
  ArrowUpRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Conversation, ConversationStatus, Channel, Sentiment } from '@/types/conversation';
import { conversationsApi } from '@/api/conversations';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function ChannelIcon({ channel }: { channel: Channel }) {
  const iconMap = {
    email: <Mail className="h-4 w-4 text-blue-500" />,
    whatsapp: <MessageSquare className="h-4 w-4 text-green-500" />,
    phone: <Phone className="h-4 w-4 text-purple-500" />,
    webchat: <Globe className="h-4 w-4 text-orange-500" />,
  };

  const labelMap = {
    email: 'Email',
    whatsapp: 'WhatsApp',
    phone: 'Telefon',
    webchat: 'Web Chat',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{iconMap[channel]}</TooltipTrigger>
        <TooltipContent>{labelMap[channel]}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SentimentIndicator({ sentiment, score }: { sentiment: Sentiment; score: number }) {
  const config = {
    positive: { emoji: '😊', label: 'Pozitiv', color: 'text-green-600 bg-green-50' },
    neutral: { emoji: '😐', label: 'Neutru', color: 'text-gray-600 bg-gray-50' },
    negative: { emoji: '😟', label: 'Negativ', color: 'text-red-600 bg-red-50' },
  };

  const { emoji, label, color } = config[sentiment];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={cn('flex items-center gap-1 px-2 py-1 rounded text-sm', color)}>
            <span>{emoji}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Scor sentiment: {(score * 100).toFixed(0)}%
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  const statusConfig = {
    active: { 
      label: 'Activ', 
      icon: <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />,
      variant: 'default' as const,
      className: 'bg-green-500/10 text-green-700 border-green-200'
    },
    waiting: { 
      label: 'Așteaptă', 
      icon: <Clock className="h-3 w-3" />,
      variant: 'outline' as const,
      className: 'text-yellow-700 border-yellow-300'
    },
    escalated: { 
      label: 'Escaladat', 
      icon: <AlertTriangle className="h-3 w-3" />,
      variant: 'destructive' as const,
      className: ''
    },
    resolved: { 
      label: 'Rezolvat', 
      icon: <CheckCircle className="h-3 w-3" />,
      variant: 'secondary' as const,
      className: 'bg-gray-100 text-gray-700'
    },
    paused: { 
      label: 'Pauză', 
      icon: <Pause className="h-3 w-3" />,
      variant: 'outline' as const,
      className: 'text-gray-500'
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn('gap-1', config.className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function AgentIndicator({ isAI, agentName }: { isAI: boolean; agentName?: string }) {
  if (isAI) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">AI Agent</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <User className="h-4 w-4 text-blue-500" />
      <span>{agentName ?? 'Agent'}</span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ConversationsTableProps {
  tenantId: string;
}

export function ConversationsTable({ tenantId }: ConversationsTableProps) {
  const navigate = useNavigate();

  // State
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'lastMessageAt', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  // Query params
  const queryParams = useMemo(() => ({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sortBy: sorting[0]?.id,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    search: globalFilter || undefined,
    channel: columnFilters.find(f => f.id === 'channel')?.value as Channel[] | undefined,
    status: columnFilters.find(f => f.id === 'status')?.value as ConversationStatus[] | undefined,
  }), [pagination, sorting, globalFilter, columnFilters]);

  // Data fetching
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversations', tenantId, queryParams],
    queryFn: () => conversationsApi.getConversations(tenantId, queryParams),
    staleTime: 10_000, // Refresh more frequently for conversations
    refetchInterval: 30_000, // Auto-refresh every 30 seconds
  });

  // Columns
  const columns: ColumnDef<Conversation>[] = useMemo(() => [
    // Contact column
    {
      accessorKey: 'contact',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact" />
      ),
      cell: ({ row }) => {
        const conversation = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={conversation.contact.avatarUrl} />
              <AvatarFallback>
                {conversation.contact.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{conversation.contact.name}</span>
              {conversation.contact.company && (
                <span className="text-xs text-muted-foreground">
                  {conversation.contact.company}
                </span>
              )}
            </div>
            {conversation.unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {conversation.unreadCount}
              </Badge>
            )}
          </div>
        );
      },
      meta: { title: 'Contact' },
      size: 220,
    },

    // Channel column
    {
      accessorKey: 'channel',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Canal" />
      ),
      cell: ({ row }) => <ChannelIcon channel={row.original.channel} />,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      meta: { title: 'Canal' },
      size: 80,
    },

    // Last message column
    {
      accessorKey: 'lastMessage',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ultimul Mesaj" />
      ),
      cell: ({ row }) => {
        const conversation = row.original;
        return (
          <div className="flex flex-col max-w-[300px]">
            <span className="text-sm line-clamp-1">
              {conversation.lastMessage?.content}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                addSuffix: true,
                locale: ro,
              })}
            </span>
          </div>
        );
      },
      enableSorting: false,
      meta: { title: 'Ultimul Mesaj' },
      size: 300,
    },

    // Sentiment column
    {
      accessorKey: 'sentiment',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sentiment" />
      ),
      cell: ({ row }) => (
        <SentimentIndicator 
          sentiment={row.original.sentiment} 
          score={row.original.sentimentScore}
        />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      meta: { title: 'Sentiment' },
      size: 100,
    },

    // Agent column
    {
      accessorKey: 'isAIHandled',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Agent" />
      ),
      cell: ({ row }) => (
        <AgentIndicator 
          isAI={row.original.isAIHandled} 
          agentName={row.original.assignedAgent?.name}
        />
      ),
      meta: { title: 'Agent' },
      size: 120,
    },

    // Status column
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <ConversationStatusBadge status={row.original.status} />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      meta: { title: 'Status' },
      size: 120,
    },

    // Actions column
    {
      id: 'actions',
      cell: ({ row }) => {
        const conversation = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate(`/conversations/${conversation.id}`)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Deschide conversația
              </DropdownMenuItem>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Vezi profil contact
              </DropdownMenuItem>
              {conversation.isAIHandled && (
                <DropdownMenuItem>
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Preia de la AI
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <CheckCircle className="mr-2 h-4 w-4" />
                Marchează rezolvat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ], [navigate]);

  // Faceted filters
  const facetedFilters = useMemo(() => [
    {
      columnId: 'channel',
      title: 'Canal',
      options: [
        { label: 'Email', value: 'email', icon: <Mail className="h-4 w-4" /> },
        { label: 'WhatsApp', value: 'whatsapp', icon: <MessageSquare className="h-4 w-4" /> },
        { label: 'Telefon', value: 'phone', icon: <Phone className="h-4 w-4" /> },
        { label: 'Web Chat', value: 'webchat', icon: <Globe className="h-4 w-4" /> },
      ],
    },
    {
      columnId: 'status',
      title: 'Status',
      options: [
        { label: 'Activ', value: 'active' },
        { label: 'Așteaptă', value: 'waiting' },
        { label: 'Escaladat', value: 'escalated' },
        { label: 'Rezolvat', value: 'resolved' },
        { label: 'Pauză', value: 'paused' },
      ],
    },
    {
      columnId: 'sentiment',
      title: 'Sentiment',
      options: [
        { label: '😊 Pozitiv', value: 'positive' },
        { label: '😐 Neutru', value: 'neutral' },
        { label: '😟 Negativ', value: 'negative' },
      ],
    },
  ], []);

  return (
    <DataTable
      columns={columns}
      data={data?.conversations ?? []}
      isLoading={isLoading}
      error={error}
      
      pageCount={data?.totalPages ?? 0}
      pageSize={pagination.pageSize}
      pageIndex={pagination.pageIndex}
      onPaginationChange={setPagination}
      manualPagination
      
      sorting={sorting}
      onSortingChange={setSorting}
      manualSorting
      
      columnFilters={columnFilters}
      onColumnFiltersChange={setColumnFilters}
      globalFilter={globalFilter}
      onGlobalFilterChange={setGlobalFilter}
      manualFiltering
      
      onRowClick={(conversation) => navigate(`/conversations/${conversation.id}`)}
      
      emptyMessage="Nu există conversații active."
      highlightNewRows
      newRowIds={data?.newConversationIds ?? new Set()}
      getRowId={(row) => row.id}
    />
  );
}
```

## 3.3 Conversation Types

```typescript
// src/types/conversation.ts
export type Channel = 'email' | 'whatsapp' | 'phone' | 'webchat';
export type ConversationStatus = 'active' | 'waiting' | 'escalated' | 'resolved' | 'paused';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  content: string;
  isFromContact: boolean;
  timestamp: string;
  channel: Channel;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Conversation {
  id: string;
  tenantId: string;
  contact: Contact;
  channel: Channel;
  status: ConversationStatus;
  sentiment: Sentiment;
  sentimentScore: number;
  isAIHandled: boolean;
  assignedAgent?: Agent;
  lastMessage?: Message;
  lastMessageAt: string;
  unreadCount: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  newConversationIds?: Set<string>;
}
```

---

# 4. NEGOTIATIONS TABLE

## 4.1 Negotiations Table Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        NEGOTIATIONS TABLE                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Caută...]  [Stare ▼]  [Prioritate ▼]  [Agent ▼]  [⚙️ Vizualizare]       │
├──────────────────────────────────────────────────────────────────────────────┤
│ │ Client         │ Produse │ Valoare    │ Stare FSM    │ Scor  │ Priorit │ T│
├─┼────────────────┼─────────┼────────────┼──────────────┼───────┼─────────┼──┤
│ │ SC Agro SRL    │ 3 prod  │ 45,000 RON │ 🔄 Negociere │ 78%   │ 🔴 High │ 2│
│ │ Ferma Verde    │ 1 prod  │ 12,500 RON │ ⏳ Așteaptă  │ 65%   │ 🟡 Med  │ 5│
│ │ Coop Dunărea   │ 5 prod  │ 125,000RON │ ✅ Acceptată │ 92%   │ 🔴 High │ 1│
│ │ Ion Popescu    │ 2 prod  │ 8,200 RON  │ 📝 Ofertare  │ 45%   │ 🟢 Low  │ 8│
│ │ Maria Ionescu  │ 1 prod  │ 3,500 RON  │ ❌ Respinsă  │ 23%   │ 🟢 Low  │12│
├──────────────────────────────────────────────────────────────────────────────┤
│ Total valoare: 194,200 RON                 Rânduri: [20▼]  Pagina 1 din 8   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Negotiations Table Implementation

```typescript
// src/features/negotiations/components/NegotiationsTable.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { DataTableColumnHeader } from '@/components/ui/data-table/DataTableColumnHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MoreHorizontal,
  Eye,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Negotiation, NegotiationState, Priority } from '@/types/negotiation';
import { negotiationsApi } from '@/api/negotiations';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function NegotiationStateBadge({ state }: { state: NegotiationState }) {
  const stateConfig: Record<NegotiationState, { 
    label: string; 
    icon: React.ReactNode; 
    className: string;
  }> = {
    initial_contact: { 
      label: 'Contact Inițial', 
      icon: <MessageSquare className="h-3 w-3" />,
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    qualifying: { 
      label: 'Calificare', 
      icon: <RefreshCw className="h-3 w-3" />,
      className: 'bg-purple-100 text-purple-700 border-purple-200'
    },
    offer_creation: { 
      label: 'Creare Ofertă', 
      icon: <FileText className="h-3 w-3" />,
      className: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    },
    negotiating: { 
      label: 'Negociere', 
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
      className: 'bg-orange-100 text-orange-700 border-orange-200'
    },
    awaiting_response: { 
      label: 'Așteaptă Răspuns', 
      icon: <Clock className="h-3 w-3" />,
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    },
    accepted: { 
      label: 'Acceptată', 
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-green-100 text-green-700 border-green-200'
    },
    rejected: { 
      label: 'Respinsă', 
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-red-100 text-red-700 border-red-200'
    },
    stalled: { 
      label: 'Blocată', 
      icon: <AlertTriangle className="h-3 w-3" />,
      className: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    completed: { 
      label: 'Finalizată', 
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
  };

  const config = stateConfig[state];

  return (
    <Badge variant="outline" className={cn('gap-1', config.className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function PriorityIndicator({ priority }: { priority: Priority }) {
  const config = {
    critical: { label: 'Critic', className: 'bg-red-500', ring: 'ring-red-500/30' },
    high: { label: 'Ridicat', className: 'bg-orange-500', ring: 'ring-orange-500/30' },
    medium: { label: 'Mediu', className: 'bg-yellow-500', ring: 'ring-yellow-500/30' },
    low: { label: 'Scăzut', className: 'bg-green-500', ring: 'ring-green-500/30' },
  };

  const { label, className, ring } = config[priority];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={cn(
            'h-3 w-3 rounded-full ring-2',
            className,
            ring
          )} />
        </TooltipTrigger>
        <TooltipContent>Prioritate: {label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function WinProbabilityIndicator({ score, trend }: { score: number; trend: 'up' | 'down' | 'stable' }) {
  const getColor = (s: number) => {
    if (s >= 70) return 'text-green-600';
    if (s >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const TrendIcon = trend === 'up' 
    ? TrendingUp 
    : trend === 'down' 
      ? TrendingDown 
      : null;

  return (
    <div className="flex items-center gap-2">
      <Progress value={score} className="w-16 h-2" />
      <span className={cn('font-medium text-sm', getColor(score))}>
        {score}%
      </span>
      {TrendIcon && (
        <TrendIcon className={cn(
          'h-3 w-3',
          trend === 'up' ? 'text-green-500' : 'text-red-500'
        )} />
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface NegotiationsTableProps {
  tenantId: string;
}

export function NegotiationsTable({ tenantId }: NegotiationsTableProps) {
  const navigate = useNavigate();

  // State
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'updatedAt', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  // Query
  const queryParams = useMemo(() => ({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sortBy: sorting[0]?.id,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    search: globalFilter || undefined,
    state: columnFilters.find(f => f.id === 'state')?.value as NegotiationState[] | undefined,
    priority: columnFilters.find(f => f.id === 'priority')?.value as Priority[] | undefined,
  }), [pagination, sorting, globalFilter, columnFilters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['negotiations', tenantId, queryParams],
    queryFn: () => negotiationsApi.getNegotiations(tenantId, queryParams),
    staleTime: 15_000,
  });

  // Columns
  const columns: ColumnDef<Negotiation>[] = useMemo(() => [
    // Client column
    {
      accessorKey: 'contact.name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Client" />
      ),
      cell: ({ row }) => {
        const negotiation = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{negotiation.contact.name}</span>
            {negotiation.contact.company && (
              <span className="text-xs text-muted-foreground">
                {negotiation.contact.company}
              </span>
            )}
          </div>
        );
      },
      meta: { title: 'Client' },
      size: 180,
    },

    // Products column
    {
      accessorKey: 'products',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Produse" />
      ),
      cell: ({ row }) => {
        const products = row.original.products;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary">
                  {products.length} {products.length === 1 ? 'produs' : 'produse'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <ul className="text-sm">
                  {products.slice(0, 5).map(p => (
                    <li key={p.id}>{p.name} x{p.quantity}</li>
                  ))}
                  {products.length > 5 && (
                    <li>...și încă {products.length - 5}</li>
                  )}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      enableSorting: false,
      meta: { title: 'Produse' },
      size: 100,
    },

    // Value column
    {
      accessorKey: 'totalValue',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valoare" />
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.totalValue, 'RON')}
        </div>
      ),
      meta: { title: 'Valoare' },
      size: 120,
    },

    // State column
    {
      accessorKey: 'state',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stare" />
      ),
      cell: ({ row }) => (
        <NegotiationStateBadge state={row.original.state} />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      meta: { title: 'Stare' },
      size: 150,
    },

    // Win probability column
    {
      accessorKey: 'winProbability',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Scor" />
      ),
      cell: ({ row }) => (
        <WinProbabilityIndicator 
          score={row.original.winProbability}
          trend={row.original.probabilityTrend}
        />
      ),
      meta: { title: 'Scor' },
      size: 130,
    },

    // Priority column
    {
      accessorKey: 'priority',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Prioritate" />
      ),
      cell: ({ row }) => (
        <PriorityIndicator priority={row.original.priority} />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      meta: { title: 'Prioritate' },
      size: 80,
    },

    // Time column
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Timp" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.updatedAt), {
            addSuffix: true,
            locale: ro,
          })}
        </span>
      ),
      meta: { title: 'Timp' },
      size: 100,
    },

    // Actions column
    {
      id: 'actions',
      cell: ({ row }) => {
        const negotiation = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate(`/negotiations/${negotiation.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Vizualizare
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate(`/conversations/${negotiation.conversationId}`)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Conversație
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                Generează ofertă
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ], [navigate]);

  // Summary footer
  const summaryFooter = useMemo(() => {
    if (!data) return null;
    
    return (
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>
          Valoare totală: <strong className="text-foreground">
            {formatCurrency(data.totalValue, 'RON')}
          </strong>
        </span>
        <span>
          Rata de succes: <strong className="text-foreground">
            {data.winRate.toFixed(1)}%
          </strong>
        </span>
      </div>
    );
  }, [data]);

  return (
    <DataTable
      columns={columns}
      data={data?.negotiations ?? []}
      isLoading={isLoading}
      error={error}
      
      pageCount={data?.totalPages ?? 0}
      pageSize={pagination.pageSize}
      pageIndex={pagination.pageIndex}
      onPaginationChange={setPagination}
      manualPagination
      
      sorting={sorting}
      onSortingChange={setSorting}
      manualSorting
      
      columnFilters={columnFilters}
      onColumnFiltersChange={setColumnFilters}
      globalFilter={globalFilter}
      onGlobalFilterChange={setGlobalFilter}
      manualFiltering
      
      onRowClick={(negotiation) => navigate(`/negotiations/${negotiation.id}`)}
      
      emptyMessage="Nu există negocieri active."
      footer={summaryFooter}
      getRowId={(row) => row.id}
    />
  );
}
```

## 4.3 Negotiation Types

```typescript
// src/types/negotiation.ts
export type NegotiationState = 
  | 'initial_contact'
  | 'qualifying'
  | 'offer_creation'
  | 'negotiating'
  | 'awaiting_response'
  | 'accepted'
  | 'rejected'
  | 'stalled'
  | 'completed';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface NegotiationProduct {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface Negotiation {
  id: string;
  tenantId: string;
  conversationId: string;
  contact: {
    id: string;
    name: string;
    company?: string;
  };
  products: NegotiationProduct[];
  totalValue: number;
  state: NegotiationState;
  priority: Priority;
  winProbability: number;
  probabilityTrend: 'up' | 'down' | 'stable';
  assignedAgentId?: string;
  aiConfidence: number;
  roundCount: number;
  lastOfferAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface NegotiationsResponse {
  negotiations: Negotiation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalValue: number;
  winRate: number;
}
```

---

# 5. OFFERS TABLE

## 5.1 Offers Table Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           OFFERS TABLE                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Caută...]  [Status ▼]  [Dată ▼]  [Export ▼]  [⚙️ Vizualizare]           │
├──────────────────────────────────────────────────────────────────────────────┤
│ │ Nr. Ofertă  │ Client       │ Valoare    │ Discount│ Validitate│ Status    │
├─┼─────────────┼──────────────┼────────────┼─────────┼───────────┼───────────┤
│ │ OFF-2026-001│ SC Agro SRL  │ 45,000 RON │ 15%     │ 7 zile    │ ⏳ Pending│
│ │ OFF-2026-002│ Ferma Verde  │ 12,500 RON │ 10%     │ 14 zile   │ ✅ Accept │
│ │ OFF-2026-003│ Coop Dunărea │ 125,000RON │ 20%     │ Expirat   │ ⌛ Expired│
│ │ OFF-2026-004│ Ion Popescu  │ 8,200 RON  │ 5%      │ 5 zile    │ 📝 Draft  │
│ │ OFF-2026-005│ Maria Ionescu│ 3,500 RON  │ 0%      │ 10 zile   │ ❌ Reject │
├──────────────────────────────────────────────────────────────────────────────┤
│ Valoare totală: 194,200 RON    Medie discount: 10%    Pagina 1 din 12 [◀▶]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Offers Table Implementation

```typescript
// src/features/offers/components/OffersTable.tsx
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { DataTable, BulkAction } from '@/components/ui/data-table/DataTable';
import { DataTableColumnHeader } from '@/components/ui/data-table/DataTableColumnHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Send,
  Download,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Mail,
} from 'lucide-react';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
import { differenceInDays, isPast, addDays } from 'date-fns';
import { Offer, OfferStatus } from '@/types/offer';
import { offersApi } from '@/api/offers';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const statusConfig: Record<OfferStatus, {
    label: string;
    icon: React.ReactNode;
    className: string;
  }> = {
    draft: {
      label: 'Draft',
      icon: <FileText className="h-3 w-3" />,
      className: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    pending_review: {
      label: 'Review',
      icon: <Clock className="h-3 w-3" />,
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    sent: {
      label: 'Trimisă',
      icon: <Send className="h-3 w-3" />,
      className: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    },
    pending: {
      label: 'Așteaptă',
      icon: <Clock className="h-3 w-3" />,
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    },
    accepted: {
      label: 'Acceptată',
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-green-100 text-green-700 border-green-200'
    },
    rejected: {
      label: 'Respinsă',
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-red-100 text-red-700 border-red-200'
    },
    expired: {
      label: 'Expirată',
      icon: <AlertTriangle className="h-3 w-3" />,
      className: 'bg-orange-100 text-orange-700 border-orange-200'
    },
    cancelled: {
      label: 'Anulată',
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-gray-100 text-gray-500 border-gray-200'
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={cn('gap-1', config.className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function ValidityIndicator({ validUntil, status }: { validUntil: string; status: OfferStatus }) {
  const validDate = new Date(validUntil);
  const isExpired = isPast(validDate);
  const daysRemaining = differenceInDays(validDate, new Date());

  // Don't show for terminal statuses
  if (['accepted', 'rejected', 'cancelled', 'expired'].includes(status)) {
    return (
      <span className="text-sm text-muted-foreground">
        {formatDate(validUntil)}
      </span>
    );
  }

  if (isExpired) {
    return (
      <span className="text-sm text-red-600 font-medium">
        Expirat
      </span>
    );
  }

  if (daysRemaining <= 2) {
    return (
      <span className="text-sm text-orange-600 font-medium">
        {daysRemaining} {daysRemaining === 1 ? 'zi' : 'zile'}
      </span>
    );
  }

  return (
    <span className="text-sm text-muted-foreground">
      {daysRemaining} zile
    </span>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface OffersTableProps {
  tenantId: string;
  negotiationId?: string; // Optional filter by negotiation
}

export function OffersTable({ tenantId, negotiationId }: OffersTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [rowSelection, setRowSelection] = useState({});

  // Query params
  const queryParams = useMemo(() => ({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sortBy: sorting[0]?.id,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    search: globalFilter || undefined,
    status: columnFilters.find(f => f.id === 'status')?.value as OfferStatus[] | undefined,
    negotiationId,
  }), [pagination, sorting, globalFilter, columnFilters, negotiationId]);

  // Data fetching
  const { data, isLoading, error } = useQuery({
    queryKey: ['offers', tenantId, queryParams],
    queryFn: () => offersApi.getOffers(tenantId, queryParams),
    staleTime: 30_000,
  });

  // Mutations
  const sendOfferMutation = useMutation({
    mutationFn: (offerId: string) => offersApi.sendOffer(tenantId, offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', tenantId] });
      toast({
        title: 'Ofertă trimisă',
        description: 'Oferta a fost trimisă cu succes către client.',
      });
    },
  });

  const duplicateOfferMutation = useMutation({
    mutationFn: (offerId: string) => offersApi.duplicateOffer(tenantId, offerId),
    onSuccess: (newOffer) => {
      queryClient.invalidateQueries({ queryKey: ['offers', tenantId] });
      toast({
        title: 'Ofertă duplicată',
        description: 'S-a creat o nouă ofertă bazată pe cea selectată.',
      });
      navigate(`/offers/${newOffer.id}/edit`);
    },
  });

  const deleteOffersMutation = useMutation({
    mutationFn: (offerIds: string[]) => offersApi.deleteOffers(tenantId, offerIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', tenantId] });
      setRowSelection({});
      toast({
        title: 'Oferte șterse',
        description: 'Ofertele selectate au fost șterse.',
      });
    },
  });

  // Columns
  const columns: ColumnDef<Offer>[] = useMemo(() => [
    // Offer number column
    {
      accessorKey: 'offerNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nr. Ofertă" />
      ),
      cell: ({ row }) => (
        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
          {row.original.offerNumber}
        </code>
      ),
      meta: { title: 'Nr. Ofertă' },
      size: 130,
    },

    // Client column
    {
      accessorKey: 'contact.name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Client" />
      ),
      cell: ({ row }) => {
        const offer = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{offer.contact.name}</span>
            {offer.contact.company && (
              <span className="text-xs text-muted-foreground">
                {offer.contact.company}
              </span>
            )}
          </div>
        );
      },
      meta: { title: 'Client' },
      size: 180,
    },

    // Value column
    {
      accessorKey: 'totalValue',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valoare" />
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-medium">
            {formatCurrency(row.original.totalValue, 'RON')}
          </div>
          {row.original.originalValue !== row.original.totalValue && (
            <div className="text-xs text-muted-foreground line-through">
              {formatCurrency(row.original.originalValue, 'RON')}
            </div>
          )}
        </div>
      ),
      meta: { title: 'Valoare' },
      size: 120,
    },

    // Discount column
    {
      accessorKey: 'discountPercent',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Discount" />
      ),
      cell: ({ row }) => {
        const discount = row.original.discountPercent;
        return (
          <Badge 
            variant={discount > 0 ? 'default' : 'outline'}
            className={discount > 15 ? 'bg-green-500' : ''}
          >
            {formatPercent(discount / 100)}
          </Badge>
        );
      },
      meta: { title: 'Discount' },
      size: 90,
    },

    // Validity column
    {
      accessorKey: 'validUntil',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Validitate" />
      ),
      cell: ({ row }) => (
        <ValidityIndicator 
          validUntil={row.original.validUntil}
          status={row.original.status}
        />
      ),
      meta: { title: 'Validitate' },
      size: 100,
    },

    // Status column
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <OfferStatusBadge status={row.original.status} />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      meta: { title: 'Status' },
      size: 120,
    },

    // Actions column
    {
      id: 'actions',
      cell: ({ row }) => {
        const offer = row.original;
        const canSend = offer.status === 'draft' || offer.status === 'pending_review';
        const canEdit = offer.status === 'draft';

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate(`/offers/${offer.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Vizualizare
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => navigate(`/offers/${offer.id}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editare
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => duplicateOfferMutation.mutate(offer.id)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplică
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canSend && (
                <DropdownMenuItem
                  onClick={() => sendOfferMutation.mutate(offer.id)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Trimite către client
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Descarcă PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => deleteOffersMutation.mutate([offer.id])}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Șterge
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ], [navigate, sendOfferMutation, duplicateOfferMutation, deleteOffersMutation]);

  // Bulk actions
  const bulkActions: BulkAction<Offer>[] = useMemo(() => [
    {
      id: 'export',
      label: 'Exportă PDF',
      icon: <Download className="h-4 w-4" />,
      onAction: async (rows) => {
        // Export logic
      },
    },
    {
      id: 'delete',
      label: 'Șterge',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      disabled: (rows) => rows.some(r => !['draft', 'cancelled'].includes(r.status)),
      onAction: (rows) => deleteOffersMutation.mutate(rows.map(r => r.id)),
      confirmMessage: 'Sigur doriți să ștergeți ofertele selectate?',
    },
  ], [deleteOffersMutation]);

  // Summary footer
  const summaryFooter = useMemo(() => {
    if (!data) return null;
    
    return (
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>
          Valoare totală: <strong className="text-foreground">
            {formatCurrency(data.totalValue, 'RON')}
          </strong>
        </span>
        <span>
          Discount mediu: <strong className="text-foreground">
            {formatPercent(data.averageDiscount / 100)}
          </strong>
        </span>
      </div>
    );
  }, [data]);

  return (
    <DataTable
      columns={columns}
      data={data?.offers ?? []}
      isLoading={isLoading}
      error={error}
      
      pageCount={data?.totalPages ?? 0}
      pageSize={pagination.pageSize}
      pageIndex={pagination.pageIndex}
      onPaginationChange={setPagination}
      manualPagination
      
      sorting={sorting}
      onSortingChange={setSorting}
      manualSorting
      
      columnFilters={columnFilters}
      onColumnFiltersChange={setColumnFilters}
      globalFilter={globalFilter}
      onGlobalFilterChange={setGlobalFilter}
      manualFiltering
      
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      enableRowSelection={(row) => ['draft', 'cancelled'].includes(row.status)}
      
      bulkActions={bulkActions}
      onRowClick={(offer) => navigate(`/offers/${offer.id}`)}
      
      emptyMessage="Nu există oferte."
      footer={summaryFooter}
      getRowId={(row) => row.id}
    />
  );
}
```

## 5.3 Offer Types

```typescript
// src/types/offer.ts
export type OfferStatus = 
  | 'draft'
  | 'pending_review'
  | 'sent'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export interface OfferItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface Offer {
  id: string;
  tenantId: string;
  offerNumber: string;
  negotiationId: string;
  contact: {
    id: string;
    name: string;
    company?: string;
    email: string;
  };
  items: OfferItem[];
  originalValue: number;
  discountPercent: number;
  discountAmount: number;
  totalValue: number;
  currency: string;
  status: OfferStatus;
  validUntil: string;
  notes?: string;
  terms?: string;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface OffersResponse {
  offers: Offer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalValue: number;
  averageDiscount: number;
}
```

---

# 6. ORDERS TABLE

## 6.1 Orders Table Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ORDERS TABLE                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Caută...]  [Status ▼]  [Plată ▼]  [Perioadă ▼]  [⚙️ Vizualizare]        │
├──────────────────────────────────────────────────────────────────────────────┤
│ │ Nr. Comandă │ Client       │ Valoare    │ Plată     │ Livrare   │ Status  │
├─┼─────────────┼──────────────┼────────────┼───────────┼───────────┼─────────┤
│ │ CMD-001234  │ SC Agro SRL  │ 45,000 RON │ ✅ Plătit │ 📦 Livrat │ ✅ Done │
│ │ CMD-001235  │ Ferma Verde  │ 12,500 RON │ ⏳ Pend.  │ 🚚 Trans. │ 🔄 Proc │
│ │ CMD-001236  │ Coop Dunărea │ 125,000RON │ 💳 Parțial│ ⏳ Prepar │ 🟡 Wait │
│ │ CMD-001237  │ Ion Popescu  │ 8,200 RON  │ ❌ Nepl.  │ -- N/A -- │ 📝 New  │
│ │ CMD-001238  │ Maria Ionescu│ 3,500 RON  │ ✅ Plătit │ ❌ Anulat │ ❌ Canc │
├──────────────────────────────────────────────────────────────────────────────┤
│ Total: 194,200 RON   Plătit: 48,500 RON   Restant: 145,700 RON   Pag 1/15  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Orders Table Implementation

```typescript
// src/features/orders/components/OrdersTable.tsx
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { DataTable, BulkAction } from '@/components/ui/data-table/DataTable';
import { DataTableColumnHeader } from '@/components/ui/data-table/DataTableColumnHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Eye,
  FileText,
  Truck,
  CreditCard,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Printer,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Order, OrderStatus, PaymentStatus, DeliveryStatus } from '@/types/order';
import { ordersApi } from '@/api/orders';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const statusConfig: Record<OrderStatus, {
    label: string;
    icon: React.ReactNode;
    className: string;
  }> = {
    new: {
      label: 'Nouă',
      icon: <FileText className="h-3 w-3" />,
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    confirmed: {
      label: 'Confirmată',
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    },
    processing: {
      label: 'Procesare',
      icon: <Package className="h-3 w-3" />,
      className: 'bg-purple-100 text-purple-700 border-purple-200'
    },
    awaiting_payment: {
      label: 'Așteaptă plată',
      icon: <CreditCard className="h-3 w-3" />,
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    },
    shipped: {
      label: 'Expediată',
      icon: <Truck className="h-3 w-3" />,
      className: 'bg-cyan-100 text-cyan-700 border-cyan-200'
    },
    delivered: {
      label: 'Livrată',
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-green-100 text-green-700 border-green-200'
    },
    completed: {
      label: 'Finalizată',
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
    cancelled: {
      label: 'Anulată',
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-red-100 text-red-700 border-red-200'
    },
    refunded: {
      label: 'Rambursată',
      icon: <AlertTriangle className="h-3 w-3" />,
      className: 'bg-orange-100 text-orange-700 border-orange-200'
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={cn('gap-1', config.className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function PaymentStatusIndicator({ status, paidAmount, totalAmount }: {
  status: PaymentStatus;
  paidAmount: number;
  totalAmount: number;
}) {
  const percentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const statusConfig: Record<PaymentStatus, {
    label: string;
    icon: React.ReactNode;
    className: string;
  }> = {
    unpaid: {
      label: 'Neplătit',
      icon: <XCircle className="h-3 w-3 text-red-500" />,
      className: 'text-red-600'
    },
    partial: {
      label: `${percentage.toFixed(0)}%`,
      icon: <Clock className="h-3 w-3 text-yellow-500" />,
      className: 'text-yellow-600'
    },
    paid: {
      label: 'Plătit',
      icon: <CheckCircle className="h-3 w-3 text-green-500" />,
      className: 'text-green-600'
    },
    refunded: {
      label: 'Rambursat',
      icon: <AlertTriangle className="h-3 w-3 text-orange-500" />,
      className: 'text-orange-600'
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      {config.icon}
      <span className={cn('text-sm font-medium', config.className)}>
        {config.label}
      </span>
      {status === 'partial' && (
        <Progress value={percentage} className="w-12 h-1.5" />
      )}
    </div>
  );
}

function DeliveryStatusIndicator({ status, estimatedDate }: {
  status: DeliveryStatus;
  estimatedDate?: string;
}) {
  const statusConfig: Record<DeliveryStatus, {
    label: string;
    icon: React.ReactNode;
    className: string;
  }> = {
    pending: {
      label: 'În așteptare',
      icon: <Clock className="h-3 w-3 text-gray-500" />,
      className: 'text-gray-600'
    },
    preparing: {
      label: 'Pregătire',
      icon: <Package className="h-3 w-3 text-blue-500" />,
      className: 'text-blue-600'
    },
    shipped: {
      label: 'În transport',
      icon: <Truck className="h-3 w-3 text-cyan-500" />,
      className: 'text-cyan-600'
    },
    delivered: {
      label: 'Livrat',
      icon: <CheckCircle className="h-3 w-3 text-green-500" />,
      className: 'text-green-600'
    },
    returned: {
      label: 'Returnat',
      icon: <AlertTriangle className="h-3 w-3 text-orange-500" />,
      className: 'text-orange-600'
    },
    cancelled: {
      label: 'Anulat',
      icon: <XCircle className="h-3 w-3 text-red-500" />,
      className: 'text-red-600'
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1">
        {config.icon}
        <span className={cn('text-sm font-medium', config.className)}>
          {config.label}
        </span>
      </div>
      {estimatedDate && status !== 'delivered' && status !== 'cancelled' && (
        <span className="text-xs text-muted-foreground">
          Est: {formatDate(estimatedDate)}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface OrdersTableProps {
  tenantId: string;
}

export function OrdersTable({ tenantId }: OrdersTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [rowSelection, setRowSelection] = useState({});

  // Query
  const queryParams = useMemo(() => ({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sortBy: sorting[0]?.id,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    search: globalFilter || undefined,
    status: columnFilters.find(f => f.id === 'status')?.value as OrderStatus[] | undefined,
    paymentStatus: columnFilters.find(f => f.id === 'paymentStatus')?.value as PaymentStatus[] | undefined,
  }), [pagination, sorting, globalFilter, columnFilters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', tenantId, queryParams],
    queryFn: () => ordersApi.getOrders(tenantId, queryParams),
    staleTime: 30_000,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      ordersApi.updateOrderStatus(tenantId, orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', tenantId] });
      toast({ title: 'Status actualizat' });
    },
  });

  // Columns
  const columns: ColumnDef<Order>[] = useMemo(() => [
    // Order number column
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nr. Comandă" />
      ),
      cell: ({ row }) => (
        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
          {row.original.orderNumber}
        </code>
      ),
      meta: { title: 'Nr. Comandă' },
      size: 130,
    },

    // Client column
    {
      accessorKey: 'contact.name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Client" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.contact.name}</span>
          {row.original.contact.company && (
            <span className="text-xs text-muted-foreground">
              {row.original.contact.company}
            </span>
          )}
        </div>
      ),
      meta: { title: 'Client' },
      size: 180,
    },

    // Value column
    {
      accessorKey: 'totalValue',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valoare" />
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.totalValue, 'RON')}
        </div>
      ),
      meta: { title: 'Valoare' },
      size: 120,
    },

    // Payment status column
    {
      accessorKey: 'paymentStatus',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Plată" />
      ),
      cell: ({ row }) => (
        <PaymentStatusIndicator
          status={row.original.paymentStatus}
          paidAmount={row.original.paidAmount}
          totalAmount={row.original.totalValue}
        />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      meta: { title: 'Plată' },
      size: 130,
    },

    // Delivery status column
    {
      accessorKey: 'deliveryStatus',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Livrare" />
      ),
      cell: ({ row }) => (
        <DeliveryStatusIndicator
          status={row.original.deliveryStatus}
          estimatedDate={row.original.estimatedDeliveryDate}
        />
      ),
      meta: { title: 'Livrare' },
      size: 130,
    },

    // Status column
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <OrderStatusBadge status={row.original.status} />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      meta: { title: 'Status' },
      size: 120,
    },

    // Actions column
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Vizualizare
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                Generează factură
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Printer className="mr-2 h-4 w-4" />
                Printează AWB
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Exportă
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ], [navigate]);

  // Summary footer
  const summaryFooter = useMemo(() => {
    if (!data) return null;

    return (
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>
          Total: <strong className="text-foreground">
            {formatCurrency(data.summary.total, 'RON')}
          </strong>
        </span>
        <span>
          Plătit: <strong className="text-green-600">
            {formatCurrency(data.summary.paid, 'RON')}
          </strong>
        </span>
        <span>
          Restant: <strong className="text-red-600">
            {formatCurrency(data.summary.outstanding, 'RON')}
          </strong>
        </span>
      </div>
    );
  }, [data]);

  return (
    <DataTable
      columns={columns}
      data={data?.orders ?? []}
      isLoading={isLoading}
      error={error}

      pageCount={data?.totalPages ?? 0}
      pageSize={pagination.pageSize}
      pageIndex={pagination.pageIndex}
      onPaginationChange={setPagination}
      manualPagination

      sorting={sorting}
      onSortingChange={setSorting}
      manualSorting

      columnFilters={columnFilters}
      onColumnFiltersChange={setColumnFilters}
      globalFilter={globalFilter}
      onGlobalFilterChange={setGlobalFilter}
      manualFiltering

      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      enableRowSelection

      onRowClick={(order) => navigate(`/orders/${order.id}`)}

      emptyMessage="Nu există comenzi."
      footer={summaryFooter}
      getRowId={(row) => row.id}
    />
  );
}
```

---

## 7. Fiscal Documents Table

### 7.1 Overview

Tabelul pentru documente fiscale integrează e-Factura SPV și Oblio.eu, afișând facturi, proforme, avize și stornări cu status ANAF.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  Documente Fiscale                                                     [+ Nouă] [Raportare] │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  🔍 Caută document...        [Tip ▼] [Status ANAF ▼] [Perioadă ▼]              [Export ▼]  │
├──────┬────────────┬───────────────┬──────────────┬────────────┬──────────┬─────────────────┤
│  ☐   │ Număr      │ Client        │ Tip          │ Valoare    │ ANAF     │ Acțiuni         │
├──────┼────────────┼───────────────┼──────────────┼────────────┼──────────┼─────────────────┤
│  ☐   │ FCT-2024-  │ AgroTech SRL  │ 📄 Factură   │ 15,450.00  │ ✅ Trimis │ [👁] [📥] [🔄] │
│      │ 0001       │ RO12345678    │              │ RON        │ ID: 123  │                 │
├──────┼────────────┼───────────────┼──────────────┼────────────┼──────────┼─────────────────┤
│  ☐   │ PRF-2024-  │ BioFarm SA    │ 📋 Proformă  │ 8,200.00   │ ⬜ N/A   │ [👁] [📥] [→📄]│
│      │ 0015       │ RO87654321    │              │ RON        │          │                 │
├──────┼────────────┼───────────────┼──────────────┼────────────┼──────────┼─────────────────┤
│  ☐   │ FCT-2024-  │ Cereale Plus  │ 📄 Factură   │ 32,100.00  │ ⏳ Pending│ [👁] [📥] [🔄] │
│      │ 0002       │ RO11223344    │              │ RON        │          │                 │
├──────┼────────────┼───────────────┼──────────────┼────────────┼──────────┼─────────────────┤
│  ☐   │ STR-2024-  │ AgroTech SRL  │ 🔴 Stornare  │ -5,000.00  │ ✅ Trimis │ [👁] [📥]      │
│      │ 0001       │ RO12345678    │              │ RON        │ ID: 124  │                 │
├──────┼────────────┼───────────────┼──────────────┼────────────┼──────────┼─────────────────┤
│  ☐   │ AVZ-2024-  │ Transport SRL │ 📦 Aviz      │ 0.00       │ ⬜ N/A   │ [👁] [📥]      │
│      │ 0003       │ RO99887766    │              │ RON        │          │                 │
└──────┴────────────┴───────────────┴──────────────┴────────────┴──────────┴─────────────────┘
│  ◀ Prev   Pagina 1 din 15   Next ▶  │  Afișare: 10 ▼  │  Total: 145 documente              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Types

```typescript
// types/fiscal-document.ts

export type FiscalDocumentType = 
  | 'invoice'         // Factură fiscală
  | 'proforma'        // Factură proformă
  | 'credit_note'     // Stornare
  | 'debit_note'      // Notă de debit
  | 'delivery_note'   // Aviz de însoțire
  | 'receipt';        // Chitanță

export type ANAFStatus = 
  | 'not_applicable'  // N/A pentru proforme, avize
  | 'draft'           // Ciornă, nu a fost trimis
  | 'pending'         // În curs de procesare ANAF
  | 'sent'            // Trimis și validat
  | 'error'           // Eroare la trimitere
  | 'rejected'        // Respins de ANAF
  | 'cancelled';      // Anulat în SPV

export type PaymentMethod = 
  | 'bank_transfer'
  | 'cash'
  | 'card'
  | 'check'
  | 'compensation';

export interface FiscalDocumentItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  description?: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  totalWithoutVat: number;
  totalWithVat: number;
}

export interface ANAFSubmission {
  id: string;
  submittedAt: Date;
  responseAt?: Date;
  indexId?: string;
  uploadId?: string;
  status: ANAFStatus;
  errorCode?: string;
  errorMessage?: string;
  xmlContent?: string;
  responseXml?: string;
}

export interface FiscalDocument {
  id: string;
  tenantId: string;
  
  // Document identification
  type: FiscalDocumentType;
  series: string;
  number: string;
  fullNumber: string; // e.g., "FCT-2024-0001"
  
  // Dates
  issueDate: Date;
  dueDate?: Date;
  deliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Client/Supplier
  contactId: string;
  contactName: string;
  contactCui: string;
  contactAddress: string;
  contactRegCom?: string;
  contactIban?: string;
  contactBank?: string;
  
  // Related documents
  orderId?: string;
  orderNumber?: string;
  relatedDocumentId?: string; // Pentru stornări
  relatedDocumentNumber?: string;
  proformaId?: string; // Dacă a fost generată din proformă
  
  // Items
  items: FiscalDocumentItem[];
  
  // Totals
  currency: string;
  exchangeRate?: number;
  subtotal: number;
  totalVat: number;
  totalDiscount: number;
  total: number;
  
  // Payment
  paymentMethod?: PaymentMethod;
  isPaid: boolean;
  paidAmount: number;
  paidAt?: Date;
  
  // ANAF e-Factura
  anafStatus: ANAFStatus;
  anafSubmissions: ANAFSubmission[];
  lastAnafSubmission?: ANAFSubmission;
  
  // Oblio integration
  oblioId?: string;
  oblioSyncedAt?: Date;
  
  // PDF
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  
  // Notes
  notes?: string;
  internalNotes?: string;
  
  // Metadata
  createdBy: string;
  createdByName: string;
}

export interface FiscalDocumentsResponse {
  documents: FiscalDocument[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    totalVat: number;
    byType: Record<FiscalDocumentType, { count: number; total: number }>;
    byAnafStatus: Record<ANAFStatus, number>;
  };
}
```

### 7.3 Helper Components

```typescript
// components/tables/fiscal-documents/DocumentTypeBadge.tsx

import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  FileCheck, 
  FileMinus, 
  FilePlus,
  Package,
  Receipt
} from 'lucide-react';
import { FiscalDocumentType } from '@/types/fiscal-document';

interface DocumentTypeBadgeProps {
  type: FiscalDocumentType;
}

const typeConfig: Record<FiscalDocumentType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  invoice: {
    label: 'Factură',
    icon: FileText,
    variant: 'default',
    className: 'bg-blue-500 hover:bg-blue-600',
  },
  proforma: {
    label: 'Proformă',
    icon: FileCheck,
    variant: 'secondary',
    className: 'bg-gray-500 hover:bg-gray-600',
  },
  credit_note: {
    label: 'Stornare',
    icon: FileMinus,
    variant: 'destructive',
    className: '',
  },
  debit_note: {
    label: 'Notă debit',
    icon: FilePlus,
    variant: 'outline',
    className: 'border-orange-500 text-orange-600',
  },
  delivery_note: {
    label: 'Aviz',
    icon: Package,
    variant: 'secondary',
    className: 'bg-purple-500 hover:bg-purple-600 text-white',
  },
  receipt: {
    label: 'Chitanță',
    icon: Receipt,
    variant: 'outline',
    className: 'border-green-500 text-green-600',
  },
};

export function DocumentTypeBadge({ type }: DocumentTypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
```

```typescript
// components/tables/fiscal-documents/ANAFStatusBadge.tsx

import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Minus,
  FileX,
  Ban
} from 'lucide-react';
import { ANAFStatus, ANAFSubmission } from '@/types/fiscal-document';

interface ANAFStatusBadgeProps {
  status: ANAFStatus;
  lastSubmission?: ANAFSubmission;
  showDetails?: boolean;
}

const statusConfig: Record<ANAFStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  not_applicable: {
    label: 'N/A',
    icon: Minus,
    variant: 'outline',
    className: 'text-muted-foreground border-muted',
  },
  draft: {
    label: 'Ciornă',
    icon: FileX,
    variant: 'secondary',
    className: '',
  },
  pending: {
    label: 'În procesare',
    icon: Clock,
    variant: 'outline',
    className: 'border-yellow-500 text-yellow-600 animate-pulse',
  },
  sent: {
    label: 'Trimis',
    icon: CheckCircle2,
    variant: 'default',
    className: 'bg-green-500 hover:bg-green-600',
  },
  error: {
    label: 'Eroare',
    icon: AlertTriangle,
    variant: 'destructive',
    className: 'bg-orange-500 hover:bg-orange-600',
  },
  rejected: {
    label: 'Respins',
    icon: XCircle,
    variant: 'destructive',
    className: '',
  },
  cancelled: {
    label: 'Anulat',
    icon: Ban,
    variant: 'outline',
    className: 'text-muted-foreground line-through',
  },
};

export function ANAFStatusBadge({ 
  status, 
  lastSubmission,
  showDetails = true 
}: ANAFStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const badge = (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );

  if (!showDetails || !lastSubmission) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">
          {badge}
          {lastSubmission.indexId && (
            <span className="text-xs text-muted-foreground ml-1">
              #{lastSubmission.indexId}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <div className="space-y-1 text-sm">
          <p>
            <strong>Trimis:</strong>{' '}
            {format(lastSubmission.submittedAt, 'dd.MM.yyyy HH:mm')}
          </p>
          {lastSubmission.responseAt && (
            <p>
              <strong>Răspuns:</strong>{' '}
              {format(lastSubmission.responseAt, 'dd.MM.yyyy HH:mm')}
            </p>
          )}
          {lastSubmission.indexId && (
            <p>
              <strong>Index ID:</strong> {lastSubmission.indexId}
            </p>
          )}
          {lastSubmission.errorMessage && (
            <p className="text-destructive">
              <strong>Eroare:</strong> {lastSubmission.errorMessage}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
```

```typescript
// components/tables/fiscal-documents/PaymentStatusIndicator.tsx

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface PaymentStatusIndicatorProps {
  total: number;
  paidAmount: number;
  dueDate?: Date;
  currency?: string;
  showProgress?: boolean;
}

export function PaymentStatusIndicator({
  total,
  paidAmount,
  dueDate,
  currency = 'RON',
  showProgress = true,
}: PaymentStatusIndicatorProps) {
  const percentage = total > 0 ? Math.round((paidAmount / total) * 100) : 0;
  const outstanding = total - paidAmount;
  const isOverdue = dueDate && new Date() > dueDate && outstanding > 0;
  
  let status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  if (percentage >= 100) {
    status = 'paid';
  } else if (percentage > 0) {
    status = isOverdue ? 'overdue' : 'partial';
  } else {
    status = isOverdue ? 'overdue' : 'unpaid';
  }

  const statusConfig = {
    paid: {
      label: 'Plătit',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-500',
    },
    partial: {
      label: `${percentage}%`,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500',
    },
    unpaid: {
      label: 'Neplătit',
      icon: Clock,
      color: 'text-gray-500',
      bgColor: 'bg-gray-400',
    },
    overdue: {
      label: 'Întârziat',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-500',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>
      {showProgress && status !== 'paid' && (
        <div className="space-y-1">
          <Progress 
            value={percentage} 
            className="h-1.5 w-24"
            indicatorClassName={config.bgColor}
          />
          <span className="text-xs text-muted-foreground">
            {formatCurrency(paidAmount, currency)} / {formatCurrency(total, currency)}
          </span>
        </div>
      )}
      {isOverdue && dueDate && (
        <span className="text-xs text-red-500">
          Scadent: {format(dueDate, 'dd.MM.yyyy')}
        </span>
      )}
    </div>
  );
}
```


### 7.4 FiscalDocumentsTable Implementation

```typescript
// components/tables/fiscal-documents/FiscalDocumentsTable.tsx

'use client';

import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef, SortingState, ColumnFiltersState, RowSelectionState } from '@tanstack/react-table';
import { format, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { DocumentTypeBadge } from './DocumentTypeBadge';
import { ANAFStatusBadge } from './ANAFStatusBadge';
import { PaymentStatusIndicator } from './PaymentStatusIndicator';

import { 
  MoreHorizontal, 
  Eye, 
  Download, 
  Send, 
  RefreshCw,
  Printer,
  Copy,
  FileText,
  FileMinus,
  History,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Building2,
} from 'lucide-react';

import { 
  FiscalDocument, 
  FiscalDocumentsResponse,
  FiscalDocumentType,
  ANAFStatus 
} from '@/types/fiscal-document';
import { formatCurrency, formatCUI } from '@/lib/format';
import { fiscalDocumentsApi } from '@/api/fiscal-documents';
import { useToast } from '@/hooks/use-toast';

interface FiscalDocumentsTableProps {
  type?: FiscalDocumentType;
  contactId?: string;
  orderId?: string;
}

export function FiscalDocumentsTable({
  type,
  contactId,
  orderId,
}: FiscalDocumentsTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'issueDate', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  // Dialog state
  const [submitToAnafDialog, setSubmitToAnafDialog] = useState<{
    open: boolean;
    document: FiscalDocument | null;
  }>({ open: false, document: null });
  
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    document: FiscalDocument | null;
  }>({ open: false, document: null });

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(pagination.pageIndex + 1),
      pageSize: String(pagination.pageSize),
    };

    if (sorting.length > 0) {
      params.sortBy = sorting[0].id;
      params.sortOrder = sorting[0].desc ? 'desc' : 'asc';
    }

    if (globalFilter) {
      params.search = globalFilter;
    }

    if (type) {
      params.type = type;
    }

    if (contactId) {
      params.contactId = contactId;
    }

    if (orderId) {
      params.orderId = orderId;
    }

    columnFilters.forEach(filter => {
      if (Array.isArray(filter.value)) {
        params[filter.id] = filter.value.join(',');
      } else {
        params[filter.id] = String(filter.value);
      }
    });

    return params;
  }, [pagination, sorting, globalFilter, columnFilters, type, contactId, orderId]);

  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ['fiscal-documents', queryParams],
    queryFn: () => fiscalDocumentsApi.list(queryParams),
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Mutations
  const submitToAnafMutation = useMutation({
    mutationFn: (documentId: string) => fiscalDocumentsApi.submitToAnaf(documentId),
    onSuccess: (result, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      toast({
        title: 'Document trimis la ANAF',
        description: `Index ID: ${result.indexId}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Eroare la trimitere ANAF',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const refreshAnafStatusMutation = useMutation({
    mutationFn: (documentId: string) => fiscalDocumentsApi.refreshAnafStatus(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      toast({
        title: 'Status ANAF actualizat',
      });
    },
  });

  const generatePdfMutation = useMutation({
    mutationFn: (documentId: string) => fiscalDocumentsApi.generatePdf(documentId),
    onSuccess: (result) => {
      window.open(result.pdfUrl, '_blank');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (documentId: string) => fiscalDocumentsApi.duplicate(documentId),
    onSuccess: (newDocument) => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      navigate(`/fiscal-documents/${newDocument.id}/edit`);
      toast({
        title: 'Document duplicat',
        description: `Noul document: ${newDocument.fullNumber}`,
      });
    },
  });

  const createCreditNoteMutation = useMutation({
    mutationFn: (documentId: string) => fiscalDocumentsApi.createCreditNote(documentId),
    onSuccess: (creditNote) => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      navigate(`/fiscal-documents/${creditNote.id}/edit`);
      toast({
        title: 'Stornare creată',
        description: `Document: ${creditNote.fullNumber}`,
      });
    },
  });

  const cancelAnafMutation = useMutation({
    mutationFn: (documentId: string) => fiscalDocumentsApi.cancelInAnaf(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      toast({
        title: 'Document anulat în SPV',
      });
    },
  });

  // Handle submit to ANAF
  const handleSubmitToAnaf = useCallback((document: FiscalDocument) => {
    setSubmitToAnafDialog({ open: true, document });
  }, []);

  const confirmSubmitToAnaf = useCallback(() => {
    if (submitToAnafDialog.document) {
      submitToAnafMutation.mutate(submitToAnafDialog.document.id);
    }
    setSubmitToAnafDialog({ open: false, document: null });
  }, [submitToAnafDialog.document, submitToAnafMutation]);

  // Column definitions
  const columns: ColumnDef<FiscalDocument>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selectează toate"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Selectează rând"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'fullNumber',
      header: 'Număr',
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <div className="space-y-1">
            <div className="font-medium">{doc.fullNumber}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(doc.issueDate), 'dd.MM.yyyy')}
            </div>
          </div>
        );
      },
      size: 130,
    },
    {
      accessorKey: 'type',
      header: 'Tip',
      cell: ({ row }) => (
        <DocumentTypeBadge type={row.original.type} />
      ),
      filterFn: (row, id, value: string[]) => {
        return value.includes(row.getValue(id));
      },
      size: 120,
    },
    {
      accessorKey: 'contactName',
      header: 'Client',
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <div className="space-y-1 max-w-[200px]">
            <div className="font-medium truncate" title={doc.contactName}>
              {doc.contactName}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>{formatCUI(doc.contactCui)}</span>
            </div>
          </div>
        );
      },
      size: 200,
    },
    {
      accessorKey: 'total',
      header: 'Valoare',
      cell: ({ row }) => {
        const doc = row.original;
        const isNegative = doc.type === 'credit_note';
        return (
          <div className={`text-right font-medium ${isNegative ? 'text-red-600' : ''}`}>
            {isNegative && '-'}
            {formatCurrency(Math.abs(doc.total), doc.currency)}
          </div>
        );
      },
      size: 120,
    },
    {
      id: 'payment',
      header: 'Plată',
      cell: ({ row }) => {
        const doc = row.original;
        // Nu afișăm status plată pentru stornări și avize
        if (doc.type === 'credit_note' || doc.type === 'delivery_note') {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <PaymentStatusIndicator
            total={doc.total}
            paidAmount={doc.paidAmount}
            dueDate={doc.dueDate ? new Date(doc.dueDate) : undefined}
            currency={doc.currency}
            showProgress={true}
          />
        );
      },
      size: 150,
    },
    {
      accessorKey: 'anafStatus',
      header: 'ANAF',
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <ANAFStatusBadge
            status={doc.anafStatus}
            lastSubmission={doc.lastAnafSubmission}
            showDetails={true}
          />
        );
      },
      filterFn: (row, id, value: string[]) => {
        return value.includes(row.getValue(id));
      },
      size: 130,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const doc = row.original;
        
        const canSubmitToAnaf = 
          doc.type === 'invoice' && 
          ['draft', 'error', 'rejected'].includes(doc.anafStatus);
        
        const canRefreshAnaf = 
          doc.anafStatus === 'pending';
        
        const canCreateCreditNote = 
          doc.type === 'invoice' && 
          doc.anafStatus === 'sent' &&
          !doc.relatedDocumentId;

        const canCancelInAnaf = 
          doc.anafStatus === 'sent';

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* View & Download */}
              <DropdownMenuItem onClick={() => navigate(`/fiscal-documents/${doc.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Vizualizare
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => generatePdfMutation.mutate(doc.id)}
                disabled={generatePdfMutation.isPending}
              >
                {generatePdfMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Descarcă PDF
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Printează
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* ANAF Actions */}
              {canSubmitToAnaf && (
                <DropdownMenuItem onClick={() => handleSubmitToAnaf(doc)}>
                  <Send className="mr-2 h-4 w-4" />
                  Trimite la ANAF
                </DropdownMenuItem>
              )}
              
              {canRefreshAnaf && (
                <DropdownMenuItem 
                  onClick={() => refreshAnafStatusMutation.mutate(doc.id)}
                  disabled={refreshAnafStatusMutation.isPending}
                >
                  {refreshAnafStatusMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Verifică status ANAF
                </DropdownMenuItem>
              )}
              
              {doc.lastAnafSubmission?.indexId && (
                <DropdownMenuItem asChild>
                  <a 
                    href={`https://efactura.mfinante.gov.ro/documents/${doc.lastAnafSubmission.indexId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Vezi în SPV
                  </a>
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {/* Document Actions */}
              <DropdownMenuItem onClick={() => duplicateMutation.mutate(doc.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplică
              </DropdownMenuItem>
              
              {canCreateCreditNote && (
                <DropdownMenuItem onClick={() => createCreditNoteMutation.mutate(doc.id)}>
                  <FileMinus className="mr-2 h-4 w-4" />
                  Creează stornare
                </DropdownMenuItem>
              )}
              
              {doc.proformaId && (
                <DropdownMenuItem onClick={() => navigate(`/fiscal-documents/${doc.proformaId}`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Vezi proforma
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <History className="mr-2 h-4 w-4" />
                  Istoric
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => navigate(`/fiscal-documents/${doc.id}/history`)}>
                    Istoric modificări
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/fiscal-documents/${doc.id}/anaf-history`)}>
                    Istoric ANAF
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              {canCancelInAnaf && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setCancelDialog({ open: true, document: doc })}
                    className="text-destructive focus:text-destructive"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Anulează în SPV
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ], [navigate, handleSubmitToAnaf, generatePdfMutation, refreshAnafStatusMutation, duplicateMutation, createCreditNoteMutation]);

  // Faceted filters
  const facetedFilters = useMemo(() => [
    {
      column: 'type',
      title: 'Tip document',
      options: [
        { label: 'Factură', value: 'invoice' },
        { label: 'Proformă', value: 'proforma' },
        { label: 'Stornare', value: 'credit_note' },
        { label: 'Notă debit', value: 'debit_note' },
        { label: 'Aviz', value: 'delivery_note' },
        { label: 'Chitanță', value: 'receipt' },
      ],
    },
    {
      column: 'anafStatus',
      title: 'Status ANAF',
      options: [
        { label: 'N/A', value: 'not_applicable' },
        { label: 'Ciornă', value: 'draft' },
        { label: 'În procesare', value: 'pending' },
        { label: 'Trimis', value: 'sent' },
        { label: 'Eroare', value: 'error' },
        { label: 'Respins', value: 'rejected' },
        { label: 'Anulat', value: 'cancelled' },
      ],
    },
  ], []);

  // Summary footer
  const summaryFooter = useMemo(() => {
    if (!data?.summary) return null;

    return (
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground px-2">
        <span>
          Facturat:{' '}
          <strong className="text-foreground">
            {formatCurrency(data.summary.totalInvoiced, 'RON')}
          </strong>
        </span>
        <span>
          Încasat:{' '}
          <strong className="text-green-600">
            {formatCurrency(data.summary.totalPaid, 'RON')}
          </strong>
        </span>
        <span>
          Restant:{' '}
          <strong className="text-red-600">
            {formatCurrency(data.summary.totalOutstanding, 'RON')}
          </strong>
        </span>
        <span>
          TVA:{' '}
          <strong className="text-foreground">
            {formatCurrency(data.summary.totalVat, 'RON')}
          </strong>
        </span>
      </div>
    );
  }, [data?.summary]);

  // Bulk actions
  const bulkActions = useMemo(() => {
    const selectedDocs = Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(key => data?.documents.find(d => d.id === key))
      .filter(Boolean) as FiscalDocument[];

    const canBulkSubmitToAnaf = selectedDocs.every(
      d => d.type === 'invoice' && ['draft', 'error', 'rejected'].includes(d.anafStatus)
    );

    return [
      {
        label: 'Export selectate',
        icon: Download,
        onClick: () => {
          fiscalDocumentsApi.exportBulk(selectedDocs.map(d => d.id));
        },
      },
      ...(canBulkSubmitToAnaf && selectedDocs.length > 0 ? [{
        label: 'Trimite la ANAF',
        icon: Send,
        onClick: () => {
          // Bulk submit logic
        },
      }] : []),
    ];
  }, [rowSelection, data?.documents]);

  return (
    <>
      <DataTable
        columns={columns}
        data={data?.documents ?? []}
        isLoading={isLoading}
        error={error}
        
        pageCount={data?.totalPages ?? 0}
        pageSize={pagination.pageSize}
        pageIndex={pagination.pageIndex}
        onPaginationChange={setPagination}
        manualPagination
        
        sorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        manualFiltering
        facetedFilters={facetedFilters}
        
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        enableRowSelection
        bulkActions={bulkActions}
        
        onRowClick={(doc) => navigate(`/fiscal-documents/${doc.id}`)}
        
        emptyMessage="Nu există documente fiscale."
        searchPlaceholder="Caută după număr, client, CUI..."
        footer={summaryFooter}
        getRowId={(row) => row.id}
      />

      {/* Submit to ANAF Dialog */}
      <AlertDialog 
        open={submitToAnafDialog.open} 
        onOpenChange={(open) => !open && setSubmitToAnafDialog({ open: false, document: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trimite la ANAF e-Factura</AlertDialogTitle>
            <AlertDialogDescription>
              Documentul <strong>{submitToAnafDialog.document?.fullNumber}</strong> va fi
              transmis către sistemul SPV al ANAF. Această acțiune nu poate fi anulată ușor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSubmitToAnaf}
              disabled={submitToAnafMutation.isPending}
            >
              {submitToAnafMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Trimite la ANAF
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel in SPV Dialog */}
      <AlertDialog 
        open={cancelDialog.open} 
        onOpenChange={(open) => !open && setCancelDialog({ open: false, document: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Anulează document în SPV
            </AlertDialogTitle>
            <AlertDialogDescription>
              Documentul <strong>{cancelDialog.document?.fullNumber}</strong> va fi marcat
              ca anulat în sistemul SPV al ANAF. Această acțiune este permanentă și
              necesită aprobarea ANAF.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (cancelDialog.document) {
                  cancelAnafMutation.mutate(cancelDialog.document.id);
                }
                setCancelDialog({ open: false, document: null });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Anulează în SPV
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```


---

## 8. HITL Approvals Table

### 8.1 Overview

Tabelul pentru HITL Approvals afișează toate cererile de aprobare pending pentru AI Sales Agent, cu context, urgență și acțiuni rapide.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  Aprobări în Așteptare                                              [Auto-refresh: 30s] 🔄  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  🔍 Caută...    [Tip ▼] [Urgență ▼] [Agent ▼] [Categorie ▼]                    [Filtre ✕]  │
├──────┬─────────┬───────────────────┬────────────────┬──────────┬──────────────┬────────────┤
│  ☐   │ Urgență │ Cerere            │ Context        │ Agent    │ Timp rămas   │ Acțiuni    │
├──────┼─────────┼───────────────────┼────────────────┼──────────┼──────────────┼────────────┤
│  ☐   │ 🔴 CRIT │ 📊 Discount 25%   │ AgroTech SRL   │ 🤖 Sales │ ⏰ 15 min    │ [✓][✕][👁]│
│      │         │ pentru comanda    │ Neg: N-2024-15 │ Agent    │              │            │
│      │         │ #CMD-0045         │                │          │              │            │
├──────┼─────────┼───────────────────┼────────────────┼──────────┼──────────────┼────────────┤
│  ☐   │ 🟠 HIGH │ 💬 Mesaj WhatsApp │ BioFarm SA     │ 🤖 Sales │ ⏰ 2 ore     │ [✓][✕][👁]│
│      │         │ cu ofertă         │ Conv: C-8821   │ Agent    │              │            │
│      │         │ personalizată     │                │          │              │            │
├──────┼─────────┼───────────────────┼────────────────┼──────────┼──────────────┼────────────┤
│  ☐   │ 🟡 MED  │ 📄 Factură        │ Cereale Plus   │ 🤖 Fiscal│ ⏰ 4 ore     │ [✓][✕][👁]│
│      │         │ proformă #PRF-22  │ Order: O-1234  │ Worker   │              │            │
├──────┼─────────┼───────────────────┼────────────────┼──────────┼──────────────┼────────────┤
│  ☐   │ 🟢 LOW  │ ✉️ Email follow-up│ Transport SRL  │ 🤖 Email │ ⏰ 24 ore    │ [✓][✕][👁]│
│      │         │ pentru lead rece  │ Lead: L-5567   │ Worker   │              │            │
└──────┴─────────┴───────────────────┴────────────────┴──────────┴──────────────┴────────────┘
│  Aprobări pending: 24  │  Critice: 3  │  Expirate: 1  │  ◀ 1 2 3 ▶  │  10 ▼               │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Types

```typescript
// types/hitl-approval.ts

export type ApprovalType = 
  | 'discount_approval'           // Aprobare discount
  | 'message_approval'            // Aprobare mesaj outbound
  | 'offer_approval'              // Aprobare ofertă
  | 'invoice_approval'            // Aprobare factură
  | 'price_override'              // Suprascriere preț
  | 'contact_data_change'         // Modificare date contact
  | 'negotiation_state_change'    // Schimbare stare negociere
  | 'order_cancellation'          // Anulare comandă
  | 'credit_note_approval'        // Aprobare stornare
  | 'sensitive_topic'             // Subiect sensibil detectat
  | 'escalation_required'         // Escaladare necesară
  | 'custom';                     // Cerere custom

export type ApprovalUrgency = 
  | 'critical'    // 15-30 minute SLA
  | 'high'        // 2 ore SLA
  | 'medium'      // 4 ore SLA
  | 'low';        // 24 ore SLA

export type ApprovalStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'auto_approved'   // Aprobat automat după SLA
  | 'auto_rejected'   // Respins automat după SLA
  | 'delegated';      // Delegat altcuiva

export type ApprovalCategory = 
  | 'sales'       // Vânzări
  | 'fiscal'      // Documente fiscale
  | 'outreach'    // Comunicări
  | 'data'        // Date
  | 'system';     // Sistem

export interface ApprovalContext {
  // Related entities
  contactId?: string;
  contactName?: string;
  contactCui?: string;
  
  negotiationId?: string;
  negotiationNumber?: string;
  
  conversationId?: string;
  conversationChannel?: string;
  
  orderId?: string;
  orderNumber?: string;
  
  documentId?: string;
  documentNumber?: string;
  
  // Specific context based on type
  discountPercentage?: number;
  discountAmount?: number;
  originalPrice?: number;
  proposedPrice?: number;
  
  messageContent?: string;
  messageChannel?: 'email' | 'whatsapp' | 'sms';
  
  offerTotal?: number;
  offerItems?: number;
  
  // AI reasoning
  aiConfidence?: number;
  aiReasoning?: string;
  riskAssessment?: string;
  
  // Additional data
  metadata?: Record<string, unknown>;
}

export interface ApprovalHistoryEntry {
  id: string;
  timestamp: Date;
  action: 'created' | 'viewed' | 'approved' | 'rejected' | 'delegated' | 'escalated' | 'expired';
  userId?: string;
  userName?: string;
  comment?: string;
  metadata?: Record<string, unknown>;
}

export interface HITLApproval {
  id: string;
  tenantId: string;
  
  // Request details
  type: ApprovalType;
  category: ApprovalCategory;
  urgency: ApprovalUrgency;
  status: ApprovalStatus;
  
  // Description
  title: string;
  description: string;
  context: ApprovalContext;
  
  // Agent info
  requestingAgentId: string;
  requestingAgentName: string;
  requestingAgentType: 'ai_sales_agent' | 'email_worker' | 'whatsapp_worker' | 'fiscal_worker' | 'system';
  
  // Assignment
  assignedTo?: string;
  assignedToName?: string;
  
  // Timing
  createdAt: Date;
  updatedAt: Date;
  slaDeadline: Date;
  expiresAt?: Date;
  respondedAt?: Date;
  
  // Response
  response?: {
    decision: 'approved' | 'rejected';
    comment?: string;
    modifiedContent?: string;
    conditions?: string[];
    respondedBy: string;
    respondedByName: string;
    respondedAt: Date;
  };
  
  // History
  history: ApprovalHistoryEntry[];
  
  // Metrics
  viewCount: number;
  timeToFirstView?: number;
  timeToResponse?: number;
}

export interface HITLApprovalsResponse {
  approvals: HITLApproval[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    byUrgency: Record<ApprovalUrgency, number>;
    byCategory: Record<ApprovalCategory, number>;
    byStatus: Record<ApprovalStatus, number>;
    expiringSoon: number;  // < 30 min
    expired: number;
    avgResponseTime: number;  // în minute
  };
}
```

### 8.3 Helper Components

```typescript
// components/tables/hitl-approvals/UrgencyBadge.tsx

import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  ArrowUp, 
  Minus, 
  ArrowDown 
} from 'lucide-react';
import { ApprovalUrgency } from '@/types/hitl-approval';
import { cn } from '@/lib/utils';

interface UrgencyBadgeProps {
  urgency: ApprovalUrgency;
  animate?: boolean;
}

const urgencyConfig: Record<ApprovalUrgency, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  animateClass?: string;
}> = {
  critical: {
    label: 'CRITIC',
    icon: AlertTriangle,
    className: 'bg-red-500 text-white border-red-600',
    animateClass: 'animate-pulse',
  },
  high: {
    label: 'URGENT',
    icon: ArrowUp,
    className: 'bg-orange-500 text-white border-orange-600',
  },
  medium: {
    label: 'MEDIU',
    icon: Minus,
    className: 'bg-yellow-500 text-white border-yellow-600',
  },
  low: {
    label: 'SCĂZUT',
    icon: ArrowDown,
    className: 'bg-green-500 text-white border-green-600',
  },
};

export function UrgencyBadge({ urgency, animate = true }: UrgencyBadgeProps) {
  const config = urgencyConfig[urgency];
  const Icon = config.icon;

  return (
    <Badge 
      className={cn(
        config.className,
        animate && config.animateClass
      )}
    >
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
```

```typescript
// components/tables/hitl-approvals/ApprovalTypeBadge.tsx

import { Badge } from '@/components/ui/badge';
import { 
  Percent, 
  MessageSquare, 
  FileText, 
  Receipt,
  DollarSign,
  Database,
  GitBranch,
  XCircle,
  FileMinus,
  AlertTriangle,
  ArrowUpCircle,
  HelpCircle
} from 'lucide-react';
import { ApprovalType } from '@/types/hitl-approval';

interface ApprovalTypeBadgeProps {
  type: ApprovalType;
}

const typeConfig: Record<ApprovalType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'secondary' | 'outline';
}> = {
  discount_approval: {
    label: 'Discount',
    icon: Percent,
    variant: 'default',
  },
  message_approval: {
    label: 'Mesaj',
    icon: MessageSquare,
    variant: 'secondary',
  },
  offer_approval: {
    label: 'Ofertă',
    icon: FileText,
    variant: 'default',
  },
  invoice_approval: {
    label: 'Factură',
    icon: Receipt,
    variant: 'secondary',
  },
  price_override: {
    label: 'Preț',
    icon: DollarSign,
    variant: 'outline',
  },
  contact_data_change: {
    label: 'Date contact',
    icon: Database,
    variant: 'outline',
  },
  negotiation_state_change: {
    label: 'Stare negociere',
    icon: GitBranch,
    variant: 'outline',
  },
  order_cancellation: {
    label: 'Anulare',
    icon: XCircle,
    variant: 'destructive',
  },
  credit_note_approval: {
    label: 'Stornare',
    icon: FileMinus,
    variant: 'destructive',
  },
  sensitive_topic: {
    label: 'Sensibil',
    icon: AlertTriangle,
    variant: 'destructive',
  },
  escalation_required: {
    label: 'Escaladare',
    icon: ArrowUpCircle,
    variant: 'destructive',
  },
  custom: {
    label: 'Custom',
    icon: HelpCircle,
    variant: 'outline',
  },
};

export function ApprovalTypeBadge({ type }: ApprovalTypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
```

```typescript
// components/tables/hitl-approvals/SLAIndicator.tsx

import { useMemo } from 'react';
import { differenceInMinutes, differenceInHours, isPast } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface SLAIndicatorProps {
  deadline: Date;
  createdAt: Date;
  status: 'pending' | 'expired' | 'responded';
  respondedAt?: Date;
}

export function SLAIndicator({ 
  deadline, 
  createdAt, 
  status,
  respondedAt 
}: SLAIndicatorProps) {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const createdDate = new Date(createdAt);
  
  const { timeLeft, isExpired, isWarning, percentage } = useMemo(() => {
    if (status === 'responded' && respondedAt) {
      const responseTime = differenceInMinutes(new Date(respondedAt), createdDate);
      return {
        timeLeft: `Răspuns în ${formatDuration(responseTime)}`,
        isExpired: false,
        isWarning: false,
        percentage: 100,
      };
    }

    if (isPast(deadlineDate)) {
      return {
        timeLeft: 'EXPIRAT',
        isExpired: true,
        isWarning: true,
        percentage: 100,
      };
    }

    const totalDuration = differenceInMinutes(deadlineDate, createdDate);
    const elapsed = differenceInMinutes(now, createdDate);
    const remaining = differenceInMinutes(deadlineDate, now);
    const pct = Math.min(100, (elapsed / totalDuration) * 100);

    return {
      timeLeft: formatTimeRemaining(remaining),
      isExpired: false,
      isWarning: pct > 75,
      percentage: pct,
    };
  }, [deadline, createdAt, status, respondedAt, now]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          'flex items-center gap-2',
          isExpired && 'text-destructive',
          isWarning && !isExpired && 'text-orange-500'
        )}>
          {isExpired ? (
            <AlertTriangle className="h-4 w-4 animate-pulse" />
          ) : status === 'responded' ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Clock className={cn('h-4 w-4', isWarning && 'animate-pulse')} />
          )}
          <div className="space-y-1">
            <span className={cn(
              'text-sm font-medium',
              isExpired && 'text-destructive font-bold'
            )}>
              {timeLeft}
            </span>
            {status === 'pending' && !isExpired && (
              <Progress 
                value={percentage} 
                className="h-1 w-16"
                indicatorClassName={cn(
                  percentage > 75 ? 'bg-orange-500' : 
                  percentage > 50 ? 'bg-yellow-500' : 
                  'bg-green-500'
                )}
              />
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <p>Deadline: {format(deadlineDate, 'dd.MM.yyyy HH:mm', { locale: ro })}</p>
          <p>Creat: {format(createdDate, 'dd.MM.yyyy HH:mm', { locale: ro })}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function formatTimeRemaining(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours} ore`;
  }
  const days = Math.floor(hours / 24);
  return `${days} zile`;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
```

```typescript
// components/tables/hitl-approvals/AgentIndicator.tsx

import { Badge } from '@/components/ui/badge';
import { Bot, Mail, MessageCircle, Receipt, Settings } from 'lucide-react';

type AgentType = 'ai_sales_agent' | 'email_worker' | 'whatsapp_worker' | 'fiscal_worker' | 'system';

interface AgentIndicatorProps {
  agentType: AgentType;
  agentName: string;
}

const agentConfig: Record<AgentType, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  ai_sales_agent: {
    icon: Bot,
    color: 'text-blue-500',
  },
  email_worker: {
    icon: Mail,
    color: 'text-purple-500',
  },
  whatsapp_worker: {
    icon: MessageCircle,
    color: 'text-green-500',
  },
  fiscal_worker: {
    icon: Receipt,
    color: 'text-orange-500',
  },
  system: {
    icon: Settings,
    color: 'text-gray-500',
  },
};

export function AgentIndicator({ agentType, agentName }: AgentIndicatorProps) {
  const config = agentConfig[agentType];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${config.color}`} />
      <span className="text-sm text-muted-foreground truncate max-w-[100px]" title={agentName}>
        {agentName}
      </span>
    </div>
  );
}
```


### 8.4 HITLApprovalsTable Implementation

```typescript
// components/tables/hitl-approvals/HITLApprovalsTable.tsx

'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef, SortingState, ColumnFiltersState, RowSelectionState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { UrgencyBadge } from './UrgencyBadge';
import { ApprovalTypeBadge } from './ApprovalTypeBadge';
import { SLAIndicator } from './SLAIndicator';
import { AgentIndicator } from './AgentIndicator';

import { 
  MoreHorizontal, 
  Eye, 
  Check, 
  X,
  UserPlus,
  ArrowUpCircle,
  RefreshCw,
  Loader2,
  MessageSquare,
  FileText,
  Building2,
  Bot,
  AlertTriangle,
} from 'lucide-react';

import { 
  HITLApproval, 
  HITLApprovalsResponse,
  ApprovalUrgency,
  ApprovalCategory,
  ApprovalStatus,
} from '@/types/hitl-approval';
import { hitlApprovalsApi } from '@/api/hitl-approvals';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface HITLApprovalsTableProps {
  category?: ApprovalCategory;
  urgency?: ApprovalUrgency;
  status?: ApprovalStatus;
  assignedTo?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function HITLApprovalsTable({
  category,
  urgency,
  status = 'pending',
  assignedTo,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}: HITLApprovalsTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'slaDeadline', desc: false } // Sort by deadline ascending (most urgent first)
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  // Dialog states
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    approval: HITLApproval | null;
  }>({ open: false, approval: null });
  
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    approval: HITLApproval | null;
  }>({ open: false, approval: null });
  
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    approval: HITLApproval | null;
  }>({ open: false, approval: null });

  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(pagination.pageIndex + 1),
      pageSize: String(pagination.pageSize),
      status: status,
    };

    if (sorting.length > 0) {
      params.sortBy = sorting[0].id;
      params.sortOrder = sorting[0].desc ? 'desc' : 'asc';
    }

    if (globalFilter) {
      params.search = globalFilter;
    }

    if (category) {
      params.category = category;
    }

    if (urgency) {
      params.urgency = urgency;
    }

    if (assignedTo) {
      params.assignedTo = assignedTo;
    }

    columnFilters.forEach(filter => {
      if (Array.isArray(filter.value)) {
        params[filter.id] = filter.value.join(',');
      } else {
        params[filter.id] = String(filter.value);
      }
    });

    return params;
  }, [pagination, sorting, globalFilter, columnFilters, category, urgency, status, assignedTo]);

  // Fetch data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['hitl-approvals', queryParams],
    queryFn: () => hitlApprovalsApi.list(queryParams),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: autoRefresh ? refreshInterval : false,
    placeholderData: (previousData) => previousData,
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => 
      hitlApprovalsApi.approve(id, comment),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hitl-approvals'] });
      toast({
        title: 'Cerere aprobată',
        description: 'Acțiunea va fi executată de agent.',
      });
      setApproveDialog({ open: false, approval: null });
      setApprovalComment('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Eroare la aprobare',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      hitlApprovalsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hitl-approvals'] });
      toast({
        title: 'Cerere respinsă',
        description: 'Agentul va fi notificat.',
      });
      setRejectDialog({ open: false, approval: null });
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Eroare la respingere',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const delegateMutation = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => 
      hitlApprovalsApi.delegate(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hitl-approvals'] });
      toast({ title: 'Cerere delegată' });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (id: string) => hitlApprovalsApi.escalate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hitl-approvals'] });
      toast({ title: 'Cerere escaladată' });
    },
  });

  // Quick approve handler
  const handleQuickApprove = useCallback((approval: HITLApproval) => {
    // Pentru cereri simple, aprobăm direct
    if (approval.urgency === 'low' || approval.type === 'message_approval') {
      approveMutation.mutate({ id: approval.id });
    } else {
      // Pentru cereri complexe, cerem confirmare
      setApproveDialog({ open: true, approval });
    }
  }, [approveMutation]);

  // Quick reject handler
  const handleQuickReject = useCallback((approval: HITLApproval) => {
    setRejectDialog({ open: true, approval });
  }, []);

  // Column definitions
  const columns: ColumnDef<HITLApproval>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selectează toate"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Selectează rând"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'urgency',
      header: 'Urgență',
      cell: ({ row }) => (
        <UrgencyBadge 
          urgency={row.original.urgency} 
          animate={row.original.status === 'pending'}
        />
      ),
      filterFn: (row, id, value: string[]) => {
        return value.includes(row.getValue(id));
      },
      size: 100,
    },
    {
      id: 'request',
      header: 'Cerere',
      cell: ({ row }) => {
        const approval = row.original;
        return (
          <div className="space-y-1 max-w-[250px]">
            <div className="flex items-center gap-2">
              <ApprovalTypeBadge type={approval.type} />
            </div>
            <div className="font-medium text-sm truncate" title={approval.title}>
              {approval.title}
            </div>
            {approval.description && (
              <div className="text-xs text-muted-foreground truncate" title={approval.description}>
                {approval.description}
              </div>
            )}
          </div>
        );
      },
      size: 250,
    },
    {
      id: 'context',
      header: 'Context',
      cell: ({ row }) => {
        const ctx = row.original.context;
        return (
          <div className="space-y-1 text-sm">
            {ctx.contactName && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[120px]" title={ctx.contactName}>
                  {ctx.contactName}
                </span>
              </div>
            )}
            {ctx.negotiationNumber && (
              <div className="text-xs text-muted-foreground">
                Neg: {ctx.negotiationNumber}
              </div>
            )}
            {ctx.conversationId && (
              <div className="text-xs text-muted-foreground">
                Conv: {ctx.conversationId.slice(0, 8)}...
              </div>
            )}
            {ctx.orderNumber && (
              <div className="text-xs text-muted-foreground">
                Cmd: {ctx.orderNumber}
              </div>
            )}
          </div>
        );
      },
      size: 150,
    },
    {
      id: 'details',
      header: 'Detalii',
      cell: ({ row }) => {
        const ctx = row.original.context;
        const type = row.original.type;

        // Render specific details based on type
        if (type === 'discount_approval' && ctx.discountPercentage) {
          return (
            <div className="space-y-1">
              <Badge variant="secondary" className="font-mono">
                -{ctx.discountPercentage}%
              </Badge>
              {ctx.originalPrice && ctx.proposedPrice && (
                <div className="text-xs text-muted-foreground">
                  <span className="line-through">{ctx.originalPrice} RON</span>
                  {' → '}
                  <span className="text-green-600">{ctx.proposedPrice} RON</span>
                </div>
              )}
            </div>
          );
        }

        if (type === 'message_approval' && ctx.messageChannel) {
          return (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm capitalize">{ctx.messageChannel}</span>
            </div>
          );
        }

        if (type === 'offer_approval' && ctx.offerTotal) {
          return (
            <div className="text-sm font-medium">
              {ctx.offerTotal.toLocaleString('ro-RO')} RON
            </div>
          );
        }

        if (ctx.aiConfidence !== undefined) {
          return (
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  <span className={cn(
                    'text-xs font-medium',
                    ctx.aiConfidence >= 0.8 ? 'text-green-600' :
                    ctx.aiConfidence >= 0.5 ? 'text-yellow-600' :
                    'text-red-600'
                  )}>
                    {Math.round(ctx.aiConfidence * 100)}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Confidence AI: {Math.round(ctx.aiConfidence * 100)}%</p>
                {ctx.aiReasoning && <p className="max-w-xs">{ctx.aiReasoning}</p>}
              </TooltipContent>
            </Tooltip>
          );
        }

        return <span className="text-muted-foreground">—</span>;
      },
      size: 120,
    },
    {
      id: 'agent',
      header: 'Agent',
      cell: ({ row }) => (
        <AgentIndicator 
          agentType={row.original.requestingAgentType}
          agentName={row.original.requestingAgentName}
        />
      ),
      size: 130,
    },
    {
      accessorKey: 'slaDeadline',
      header: 'Timp rămas',
      cell: ({ row }) => (
        <SLAIndicator
          deadline={row.original.slaDeadline}
          createdAt={row.original.createdAt}
          status={row.original.status === 'pending' ? 'pending' : 
                  row.original.status === 'expired' ? 'expired' : 'responded'}
          respondedAt={row.original.respondedAt}
        />
      ),
      size: 120,
    },
    {
      id: 'quickActions',
      header: '',
      cell: ({ row }) => {
        const approval = row.original;
        if (approval.status !== 'pending') {
          return null;
        }

        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickApprove(approval);
                  }}
                  disabled={approveMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Aprobă</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickReject(approval);
                  }}
                  disabled={rejectMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Respinge</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewDialog({ open: true, approval });
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previzualizare</TooltipContent>
            </Tooltip>
          </div>
        );
      },
      size: 120,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const approval = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => navigate(`/hitl-approvals/${approval.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Vizualizare completă
              </DropdownMenuItem>
              
              {approval.status === 'pending' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setApproveDialog({ open: true, approval })}>
                    <Check className="mr-2 h-4 w-4" />
                    Aprobă cu comentariu
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRejectDialog({ open: true, approval })}>
                    <X className="mr-2 h-4 w-4" />
                    Respinge
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Delegă
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => escalateMutation.mutate(approval.id)}>
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    Escaladează
                  </DropdownMenuItem>
                </>
              )}
              
              {/* Navigation to related entities */}
              {approval.context.contactId && (
                <DropdownMenuItem onClick={() => navigate(`/contacts/${approval.context.contactId}`)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Vezi contact
                </DropdownMenuItem>
              )}
              {approval.context.negotiationId && (
                <DropdownMenuItem onClick={() => navigate(`/negotiations/${approval.context.negotiationId}`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Vezi negociere
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ], [navigate, handleQuickApprove, handleQuickReject, approveMutation, rejectMutation, escalateMutation]);

  // Faceted filters
  const facetedFilters = useMemo(() => [
    {
      column: 'urgency',
      title: 'Urgență',
      options: [
        { label: 'Critică', value: 'critical' },
        { label: 'Ridicată', value: 'high' },
        { label: 'Medie', value: 'medium' },
        { label: 'Scăzută', value: 'low' },
      ],
    },
    {
      column: 'category',
      title: 'Categorie',
      options: [
        { label: 'Vânzări', value: 'sales' },
        { label: 'Fiscal', value: 'fiscal' },
        { label: 'Comunicări', value: 'outreach' },
        { label: 'Date', value: 'data' },
        { label: 'Sistem', value: 'system' },
      ],
    },
    {
      column: 'requestingAgentType',
      title: 'Agent',
      options: [
        { label: 'AI Sales Agent', value: 'ai_sales_agent' },
        { label: 'Email Worker', value: 'email_worker' },
        { label: 'WhatsApp Worker', value: 'whatsapp_worker' },
        { label: 'Fiscal Worker', value: 'fiscal_worker' },
        { label: 'System', value: 'system' },
      ],
    },
  ], []);

  // Summary component
  const summaryHeader = useMemo(() => {
    if (!data?.summary) return null;

    return (
      <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Critice: {data.summary.byUrgency.critical || 0}
        </Badge>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          Urgente: {data.summary.byUrgency.high || 0}
        </Badge>
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Expiră curând: {data.summary.expiringSoon}
        </Badge>
        {data.summary.expired > 0 && (
          <Badge variant="destructive">
            Expirate: {data.summary.expired}
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2 text-muted-foreground">
          <span>Timp mediu răspuns: {Math.round(data.summary.avgResponseTime)} min</span>
          {autoRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }, [data?.summary, autoRefresh, refetch]);

  // Bulk actions
  const bulkActions = useMemo(() => {
    const selectedApprovals = Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(key => data?.approvals.find(a => a.id === key))
      .filter(Boolean) as HITLApproval[];

    const allPending = selectedApprovals.every(a => a.status === 'pending');

    return allPending ? [
      {
        label: 'Aprobă toate',
        icon: Check,
        onClick: () => {
          selectedApprovals.forEach(a => {
            approveMutation.mutate({ id: a.id });
          });
          setRowSelection({});
        },
      },
      {
        label: 'Respinge toate',
        icon: X,
        variant: 'destructive' as const,
        onClick: () => {
          // Show bulk reject dialog
        },
      },
    ] : [];
  }, [rowSelection, data?.approvals, approveMutation]);

  return (
    <>
      {summaryHeader}
      
      <DataTable
        columns={columns}
        data={data?.approvals ?? []}
        isLoading={isLoading}
        error={error}
        
        pageCount={data?.totalPages ?? 0}
        pageSize={pagination.pageSize}
        pageIndex={pagination.pageIndex}
        onPaginationChange={setPagination}
        manualPagination
        
        sorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        manualFiltering
        facetedFilters={facetedFilters}
        
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        enableRowSelection={(row) => row.original.status === 'pending'}
        bulkActions={bulkActions}
        
        onRowClick={(approval) => setPreviewDialog({ open: true, approval })}
        
        emptyMessage="Nu există cereri de aprobare în așteptare."
        searchPlaceholder="Caută după titlu, contact, agent..."
        getRowId={(row) => row.id}
        
        rowClassName={(row) => cn(
          row.original.urgency === 'critical' && 'bg-red-50/50',
          row.original.status === 'expired' && 'opacity-60'
        )}
      />

      {/* Approve Dialog */}
      <Dialog 
        open={approveDialog.open} 
        onOpenChange={(open) => !open && setApproveDialog({ open: false, approval: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobă cererea</DialogTitle>
            <DialogDescription>
              {approveDialog.approval?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm">
              <strong>Context:</strong> {approveDialog.approval?.context.contactName}
            </div>
            
            <div>
              <label className="text-sm font-medium">Comentariu (opțional)</label>
              <Textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Adaugă un comentariu pentru agent..."
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setApproveDialog({ open: false, approval: null })}
            >
              Anulează
            </Button>
            <Button 
              onClick={() => {
                if (approveDialog.approval) {
                  approveMutation.mutate({ 
                    id: approveDialog.approval.id, 
                    comment: approvalComment || undefined 
                  });
                }
              }}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aprobă
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog 
        open={rejectDialog.open} 
        onOpenChange={(open) => !open && setRejectDialog({ open: false, approval: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Respinge cererea</DialogTitle>
            <DialogDescription>
              {rejectDialog.approval?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivul respingerii *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explică de ce cererea este respinsă..."
                className="mt-1"
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRejectDialog({ open: false, approval: null })}
            >
              Anulează
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (rejectDialog.approval && rejectionReason.trim()) {
                  rejectMutation.mutate({ 
                    id: rejectDialog.approval.id, 
                    reason: rejectionReason 
                  });
                }
              }}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Respinge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog 
        open={previewDialog.open} 
        onOpenChange={(open) => !open && setPreviewDialog({ open: false, approval: null })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDialog.approval && (
                <UrgencyBadge urgency={previewDialog.approval.urgency} animate={false} />
              )}
              {previewDialog.approval?.title}
            </DialogTitle>
          </DialogHeader>
          
          {previewDialog.approval && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Descriere</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {previewDialog.approval.description}
                  </p>
                </CardContent>
              </Card>
              
              {previewDialog.approval.context.messageContent && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Conținut mesaj propus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                      {previewDialog.approval.context.messageContent}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {previewDialog.approval.context.aiReasoning && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Raționament AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {previewDialog.approval.context.aiReasoning}
                    </p>
                    {previewDialog.approval.context.aiConfidence !== undefined && (
                      <p className="text-sm mt-2">
                        <strong>Confidence:</strong>{' '}
                        {Math.round(previewDialog.approval.context.aiConfidence * 100)}%
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPreviewDialog({ open: false, approval: null })}
            >
              Închide
            </Button>
            {previewDialog.approval?.status === 'pending' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setPreviewDialog({ open: false, approval: null });
                    setRejectDialog({ open: true, approval: previewDialog.approval });
                  }}
                >
                  Respinge
                </Button>
                <Button 
                  onClick={() => {
                    if (previewDialog.approval) {
                      approveMutation.mutate({ id: previewDialog.approval.id });
                    }
                    setPreviewDialog({ open: false, approval: null });
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Aprobă
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```


### 8.3 HITL Approval Types

```typescript
// types/hitl-approval.ts

/**
 * Status aprobări HITL
 */
export type ApprovalStatus = 
  | 'pending'      // Așteaptă revizuire
  | 'approved'     // Aprobat
  | 'rejected'     // Respins
  | 'auto_approved' // Aprobat automat (reguli)
  | 'escalated'    // Escaladat
  | 'expired';     // Expirat (timeout SLA)

/**
 * Tipuri de aprobări
 */
export type ApprovalType =
  | 'message_send'           // Trimitere mesaj
  | 'offer_generation'       // Generare ofertă
  | 'discount_override'      // Override discount
  | 'price_adjustment'       // Ajustare preț
  | 'order_modification'     // Modificare comandă
  | 'escalation_transfer'    // Transfer agent uman
  | 'data_enrichment'        // Îmbogățire date
  | 'contact_merge'          // Fuzionare contacte
  | 'bulk_action'            // Acțiune în masă
  | 'campaign_launch';       // Lansare campanie

/**
 * Urgență cerere
 */
export type ApprovalUrgency = 
  | 'critical'  // < 30 min SLA
  | 'high'      // < 2h SLA
  | 'medium'    // < 8h SLA
  | 'low';      // < 24h SLA

/**
 * Interfață principală Approval
 */
export interface HitlApproval {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  urgency: ApprovalUrgency;
  
  // Referințe
  entityType: 'conversation' | 'negotiation' | 'offer' | 'order' | 'contact' | 'campaign';
  entityId: string;
  tenantId: string;
  
  // Conținut
  title: string;
  description: string;
  context: ApprovalContext;
  
  // Tracking
  requestedBy: 'ai_agent' | 'system' | 'user';
  requestedAt: string; // ISO timestamp
  assignedTo?: string; // User ID
  
  // Rezoluție
  resolution?: ApprovalResolution;
  
  // SLA
  slaDeadline: string;
  slaBreached: boolean;
  
  // Metadata
  priority: number; // 1-100
  tags: string[];
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Context aprobare - include toate datele necesare deciziei
 */
export interface ApprovalContext {
  // Pentru message_send
  messageContent?: string;
  recipient?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  channel?: 'email' | 'whatsapp' | 'sms';
  
  // Pentru offer_generation
  products?: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
  totalValue?: number;
  
  // Pentru discount_override
  originalDiscount?: number;
  requestedDiscount?: number;
  discountReason?: string;
  profitImpact?: number;
  
  // Pentru price_adjustment
  originalPrice?: number;
  newPrice?: number;
  priceChangeReason?: string;
  
  // AI reasoning
  aiReasoning?: string;
  aiConfidence?: number; // 0-100
  aiRecommendation?: 'approve' | 'reject' | 'review';
  
  // Documente atașate
  attachments?: Array<{
    type: 'pdf' | 'image' | 'document';
    url: string;
    name: string;
  }>;
  
  // Istoric relevant
  previousApprovals?: Array<{
    id: string;
    type: ApprovalType;
    status: ApprovalStatus;
    date: string;
  }>;
}

/**
 * Rezoluție aprobare
 */
export interface ApprovalResolution {
  status: 'approved' | 'rejected';
  resolvedBy: string; // User ID
  resolvedAt: string;
  notes?: string;
  
  // Pentru respingeri
  rejectionReason?: string;
  
  // Modificări aplicate
  modifications?: Record<string, unknown>;
}

/**
 * Request pentru filtrare
 */
export interface HitlApprovalsFilter {
  status?: ApprovalStatus[];
  type?: ApprovalType[];
  urgency?: ApprovalUrgency[];
  assignedTo?: string;
  entityType?: string;
  slaBreached?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Response paginat
 */
export interface HitlApprovalsResponse {
  approvals: HitlApproval[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    pending: number;
    urgentPending: number;
    approvedToday: number;
    rejectedToday: number;
    slaBreachRate: number;
  };
}

/**
 * Action pentru aprobare/respingere
 */
export interface ApprovalAction {
  action: 'approve' | 'reject';
  approvalId: string;
  notes?: string;
  rejectionReason?: string;
  modifications?: Record<string, unknown>;
}

/**
 * Bulk action pentru aprobări multiple
 */
export interface BulkApprovalAction {
  action: 'approve' | 'reject' | 'reassign';
  approvalIds: string[];
  notes?: string;
  assignTo?: string;
}
```

---

## 9. AI Sessions Table

### 9.1 AI Sessions Table Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Sesiuni AI Agent                                                    [Statistici ▼] │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Caută sesiune...]  [Status ▼] [Model ▼] [Conversație ▼] [Data ▼] [↻ Refresh]   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ID         │ Conversație   │ Model      │ Status   │Mesaje│ Tokens │Cost($)│Durată │
├────────────┼───────────────┼────────────┼──────────┼──────┼────────┼───────┼───────┤
│ ses_abc123 │ conv_12345    │ claude-4   │ 🟢 Active│  12  │ 8,542  │ 0.34  │ 5:23  │
│            │ Agroplant SRL │ sonnet     │          │      │        │       │       │
├────────────┼───────────────┼────────────┼──────────┼──────┼────────┼───────┼───────┤
│ ses_def456 │ conv_67890    │ claude-4   │ ⏸️ Paused│   8  │ 5,231  │ 0.21  │ 3:45  │
│            │ BioFarm SA    │ haiku      │          │      │        │       │       │
├────────────┼───────────────┼────────────┼──────────┼──────┼────────┼───────┼───────┤
│ ses_ghi789 │ conv_11223    │ gpt-4o     │ ✅ Done  │  15  │ 12,891 │ 0.52  │ 8:12  │
│            │ AgroVest SRL  │            │          │      │        │       │       │
├────────────┴───────────────┴────────────┴──────────┴──────┴────────┴───────┴───────┤
│ Total: 156 sesiuni | Active: 12 | Tokens azi: 245,832 | Cost azi: $9.83           │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 AI Sessions Table Implementation

```typescript
// components/tables/ai-sessions-table.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  flexRender,
} from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  MoreHorizontal,
  Bot,
  Play,
  Pause,
  StopCircle,
  Eye,
  RefreshCw,
  Clock,
  Zap,
  DollarSign,
  MessageSquare,
  Activity,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import {
  AISession,
  SessionStatus,
  AIModel,
  AISessionsResponse,
} from '@/types/ai-session';
import { DataTablePagination } from './data-table-pagination';
import { DataTableFacetedFilter } from './data-table-faceted-filter';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Badge status sesiune AI
 */
interface SessionStatusBadgeProps {
  status: SessionStatus;
}

const sessionStatusConfig: Record<SessionStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ReactNode;
  className: string;
}> = {
  active: {
    label: 'Activ',
    variant: 'default',
    icon: <Activity className="h-3 w-3 animate-pulse" />,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  paused: {
    label: 'Pauză',
    variant: 'secondary',
    icon: <Pause className="h-3 w-3" />,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  completed: {
    label: 'Finalizat',
    variant: 'outline',
    icon: <StopCircle className="h-3 w-3" />,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  failed: {
    label: 'Eșuat',
    variant: 'destructive',
    icon: <StopCircle className="h-3 w-3" />,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  timeout: {
    label: 'Timeout',
    variant: 'destructive',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
};

function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  const config = sessionStatusConfig[status];
  
  return (
    <Badge variant={config.variant} className={cn('gap-1', config.className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

/**
 * Indicator model AI
 */
interface ModelIndicatorProps {
  model: AIModel;
  temperature?: number;
}

const modelConfig: Record<AIModel, {
  label: string;
  provider: string;
  color: string;
  icon: string;
}> = {
  'claude-4-sonnet': {
    label: 'Claude 4 Sonnet',
    provider: 'Anthropic',
    color: 'bg-orange-100 text-orange-800',
    icon: '🟠',
  },
  'claude-4-haiku': {
    label: 'Claude 4 Haiku',
    provider: 'Anthropic',
    color: 'bg-orange-50 text-orange-700',
    icon: '🟡',
  },
  'claude-4-opus': {
    label: 'Claude 4 Opus',
    provider: 'Anthropic',
    color: 'bg-purple-100 text-purple-800',
    icon: '🟣',
  },
  'gpt-4o': {
    label: 'GPT-4o',
    provider: 'OpenAI',
    color: 'bg-green-100 text-green-800',
    icon: '🟢',
  },
  'gpt-4o-mini': {
    label: 'GPT-4o Mini',
    provider: 'OpenAI',
    color: 'bg-green-50 text-green-700',
    icon: '💚',
  },
  'gemini-pro': {
    label: 'Gemini Pro',
    provider: 'Google',
    color: 'bg-blue-100 text-blue-800',
    icon: '🔵',
  },
};

function ModelIndicator({ model, temperature }: ModelIndicatorProps) {
  const config = modelConfig[model];
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn('gap-1 font-mono text-xs', config.color)}>
          <span>{config.icon}</span>
          {model.split('-').slice(-1)[0]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <p className="font-medium">{config.label}</p>
          <p className="text-muted-foreground">{config.provider}</p>
          {temperature !== undefined && (
            <p className="text-muted-foreground">Temp: {temperature}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Indicator utilizare tokens
 */
interface TokenUsageIndicatorProps {
  inputTokens: number;
  outputTokens: number;
  maxTokens?: number;
}

function TokenUsageIndicator({ 
  inputTokens, 
  outputTokens, 
  maxTokens = 100000 
}: TokenUsageIndicatorProps) {
  const total = inputTokens + outputTokens;
  const percentage = Math.min((total / maxTokens) * 100, 100);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={percentage} className="h-2 flex-1" />
          <span className="text-xs font-mono text-muted-foreground w-14 text-right">
            {total.toLocaleString('ro-RO')}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm space-y-1">
          <p>Input: {inputTokens.toLocaleString('ro-RO')} tokens</p>
          <p>Output: {outputTokens.toLocaleString('ro-RO')} tokens</p>
          <p>Total: {total.toLocaleString('ro-RO')} tokens</p>
          <p className="text-muted-foreground">
            {percentage.toFixed(1)}% din limită ({maxTokens.toLocaleString('ro-RO')})
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Indicator cost
 */
interface CostIndicatorProps {
  cost: number;
  currency?: string;
}

function CostIndicator({ cost, currency = 'USD' }: CostIndicatorProps) {
  const formattedCost = cost.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  
  const costLevel = cost < 0.1 ? 'low' : cost < 0.5 ? 'medium' : 'high';
  const colorClass = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600',
  }[costLevel];
  
  return (
    <span className={cn('font-mono text-sm', colorClass)}>
      {formattedCost}
    </span>
  );
}

/**
 * Indicator durată sesiune
 */
interface DurationIndicatorProps {
  startedAt: string;
  endedAt?: string;
  status: SessionStatus;
}

function DurationIndicator({ startedAt, endedAt, status }: DurationIndicatorProps) {
  const [elapsed, setElapsed] = useState<string>('');
  
  // Pentru sesiuni active, actualizăm în timp real
  useEffect(() => {
    if (status === 'active') {
      const updateElapsed = () => {
        const start = new Date(startedAt);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        setElapsed(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };
      
      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    } else if (endedAt) {
      const start = new Date(startedAt);
      const end = new Date(endedAt);
      const diffMs = end.getTime() - start.getTime();
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      setElapsed(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
  }, [startedAt, endedAt, status]);
  
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span className="font-mono">{elapsed || '--:--'}</span>
    </div>
  );
}

// Need to add useEffect import
import { useEffect } from 'react';

// =============================================================================
// MAIN TABLE COMPONENT
// =============================================================================

interface AISessionsTableProps {
  conversationId?: string;
  className?: string;
}

export function AISessionsTable({ conversationId, className }: AISessionsTableProps) {
  const queryClient = useQueryClient();
  
  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'startedAt', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  
  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    
    if (conversationId) {
      params.conversationId = conversationId;
    }
    
    if (sorting.length > 0) {
      params.sortBy = sorting[0].id;
      params.sortOrder = sorting[0].desc ? 'desc' : 'asc';
    }
    
    if (globalFilter) {
      params.search = globalFilter;
    }
    
    columnFilters.forEach((filter) => {
      if (Array.isArray(filter.value)) {
        params[filter.id] = filter.value.join(',');
      } else {
        params[filter.id] = String(filter.value);
      }
    });
    
    return new URLSearchParams(params).toString();
  }, [conversationId, sorting, columnFilters, globalFilter]);
  
  // Fetch sessions
  const { data, isLoading, error, refetch } = useQuery<AISessionsResponse>({
    queryKey: ['ai-sessions', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/v1/ai-sessions?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch AI sessions');
      return response.json();
    },
    staleTime: 10000, // 10s - sesiunile active se actualizează des
    refetchInterval: 15000, // Auto-refresh la 15s pentru sesiuni active
  });
  
  // Mutations
  const pauseSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/v1/ai-sessions/${sessionId}/pause`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to pause session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
    },
  });
  
  const resumeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/v1/ai-sessions/${sessionId}/resume`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to resume session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
    },
  });
  
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/v1/ai-sessions/${sessionId}/terminate`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to terminate session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
    },
  });
  
  // Column definitions
  const columns: ColumnDef<AISession>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID Sesiune',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <code className="text-xs font-mono text-muted-foreground">
            {row.original.id.slice(0, 12)}...
          </code>
        </div>
      ),
    },
    {
      accessorKey: 'conversation',
      header: 'Conversație',
      cell: ({ row }) => {
        const conv = row.original.conversation;
        return (
          <div className="flex flex-col">
            <a 
              href={`/conversations/${conv.id}`}
              className="text-sm font-medium hover:underline"
            >
              {conv.contact.companyName || conv.contact.name}
            </a>
            <span className="text-xs text-muted-foreground">
              {conv.id.slice(0, 10)}...
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'model',
      header: 'Model',
      cell: ({ row }) => (
        <ModelIndicator 
          model={row.original.model} 
          temperature={row.original.temperature}
        />
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <SessionStatusBadge status={row.original.status} />
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'messageCount',
      header: () => (
        <div className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          <span>Mesaje</span>
        </div>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.messageCount}
        </span>
      ),
    },
    {
      id: 'tokens',
      header: () => (
        <div className="flex items-center gap-1">
          <Zap className="h-4 w-4" />
          <span>Tokens</span>
        </div>
      ),
      cell: ({ row }) => (
        <TokenUsageIndicator
          inputTokens={row.original.inputTokens}
          outputTokens={row.original.outputTokens}
          maxTokens={row.original.maxTokens}
        />
      ),
    },
    {
      accessorKey: 'cost',
      header: () => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4" />
          <span>Cost</span>
        </div>
      ),
      cell: ({ row }) => (
        <CostIndicator cost={row.original.cost} />
      ),
    },
    {
      id: 'duration',
      header: 'Durată',
      cell: ({ row }) => (
        <DurationIndicator
          startedAt={row.original.startedAt}
          endedAt={row.original.endedAt}
          status={row.original.status}
        />
      ),
    },
    {
      accessorKey: 'startedAt',
      header: 'Început',
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(row.original.startedAt), {
              addSuffix: true,
              locale: ro,
            })}
          </TooltipTrigger>
          <TooltipContent>
            {format(new Date(row.original.startedAt), 'dd MMM yyyy HH:mm:ss', { locale: ro })}
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const session = row.original;
        const isActive = session.status === 'active';
        const isPaused = session.status === 'paused';
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Deschide meniu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <a href={`/ai-sessions/${session.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Vezi detalii
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              
              {isActive && (
                <DropdownMenuItem
                  onClick={() => pauseSessionMutation.mutate(session.id)}
                  disabled={pauseSessionMutation.isPending}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pauză sesiune
                </DropdownMenuItem>
              )}
              
              {isPaused && (
                <DropdownMenuItem
                  onClick={() => resumeSessionMutation.mutate(session.id)}
                  disabled={resumeSessionMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Reia sesiune
                </DropdownMenuItem>
              )}
              
              {(isActive || isPaused) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm('Sigur doriți să terminați această sesiune?')) {
                        terminateSessionMutation.mutate(session.id);
                      }
                    }}
                    className="text-destructive"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Termină sesiune
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [pauseSessionMutation, resumeSessionMutation, terminateSessionMutation]);
  
  // Table instance
  const table = useReactTable({
    data: data?.sessions ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  
  // Status filter options
  const statusOptions = [
    { label: 'Activ', value: 'active', icon: Activity },
    { label: 'Pauză', value: 'paused', icon: Pause },
    { label: 'Finalizat', value: 'completed', icon: StopCircle },
    { label: 'Eșuat', value: 'failed', icon: StopCircle },
    { label: 'Timeout', value: 'timeout', icon: Clock },
  ];
  
  // Model filter options
  const modelOptions = [
    { label: 'Claude 4 Sonnet', value: 'claude-4-sonnet' },
    { label: 'Claude 4 Haiku', value: 'claude-4-haiku' },
    { label: 'Claude 4 Opus', value: 'claude-4-opus' },
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'Gemini Pro', value: 'gemini-pro' },
  ];
  
  // Calculate summary stats
  const summary = data?.summary ?? {
    activeSessions: 0,
    totalTokensToday: 0,
    totalCostToday: 0,
  };
  
  if (error) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-destructive mb-4">Eroare la încărcarea sesiunilor AI</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reîncearcă
        </Button>
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Activity className="h-4 w-4" />
            Sesiuni Active
          </div>
          <p className="text-2xl font-bold">{summary.activeSessions}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Zap className="h-4 w-4" />
            Tokens Azi
          </div>
          <p className="text-2xl font-bold">
            {summary.totalTokensToday.toLocaleString('ro-RO')}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            Cost Azi
          </div>
          <p className="text-2xl font-bold">
            ${summary.totalCostToday.toFixed(2)}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            Avg Cost/Sesiune
          </div>
          <p className="text-2xl font-bold">
            ${summary.activeSessions > 0 
              ? (summary.totalCostToday / (data?.pagination.total || 1)).toFixed(3)
              : '0.00'}
          </p>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută sesiune..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <DataTableFacetedFilter
            column={table.getColumn('status')}
            title="Status"
            options={statusOptions}
          />
          
          <DataTableFacetedFilter
            column={table.getColumn('model')}
            title="Model"
            options={modelOptions}
          />
        </div>
        
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>
      
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    row.original.status === 'active' && 'bg-green-50/50'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Bot className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nu există sesiuni AI
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <DataTablePagination table={table} />
    </div>
  );
}
```

### 9.3 AI Session Types

```typescript
// types/ai-session.ts

/**
 * Status sesiune AI
 */
export type SessionStatus = 
  | 'active'     // În desfășurare
  | 'paused'     // Pauză (manual sau auto-idle)
  | 'completed'  // Finalizat cu succes
  | 'failed'     // Eșuat
  | 'timeout';   // Depășire timp

/**
 * Modele AI disponibile
 */
export type AIModel =
  | 'claude-4-sonnet'
  | 'claude-4-haiku'
  | 'claude-4-opus'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gemini-pro';

/**
 * Tip sesiune
 */
export type SessionType =
  | 'sales_conversation'     // Conversație vânzări
  | 'offer_generation'       // Generare ofertă
  | 'negotiation_assist'     // Asistență negociere
  | 'data_enrichment'        // Îmbogățire date
  | 'email_compose'          // Compunere email
  | 'lead_qualification';    // Calificare lead

/**
 * Interfață sesiune AI principală
 */
export interface AISession {
  id: string;
  tenantId: string;
  
  // Tip și configurare
  type: SessionType;
  model: AIModel;
  temperature: number;
  maxTokens: number;
  
  // Referință conversație
  conversationId: string;
  conversation: {
    id: string;
    contact: {
      id: string;
      name: string;
      companyName?: string;
    };
  };
  
  // Status
  status: SessionStatus;
  
  // Statistici utilizare
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  
  // Timing
  startedAt: string;
  endedAt?: string;
  lastActivityAt: string;
  
  // Configurare
  systemPrompt?: string;
  tools: string[];
  
  // Metadata
  metadata: Record<string, unknown>;
  
  // Error tracking
  errorCount: number;
  lastError?: {
    code: string;
    message: string;
    timestamp: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Mesaj în sesiune AI
 */
export interface AISessionMessage {
  id: string;
  sessionId: string;
  
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  
  // Token tracking
  inputTokens?: number;
  outputTokens?: number;
  
  // Tool calls
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  
  toolResults?: Array<{
    callId: string;
    result: unknown;
  }>;
  
  // Timing
  processingTimeMs: number;
  
  createdAt: string;
}

/**
 * Response paginat sesiuni
 */
export interface AISessionsResponse {
  sessions: AISession[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    activeSessions: number;
    totalTokensToday: number;
    totalCostToday: number;
    averageDuration: number;
    modelDistribution: Record<AIModel, number>;
  };
}

/**
 * Request creare sesiune
 */
export interface CreateSessionRequest {
  conversationId: string;
  type: SessionType;
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[];
}

/**
 * Metrici sesiune
 */
export interface SessionMetrics {
  sessionId: string;
  
  // Performance
  avgResponseTimeMs: number;
  totalProcessingTimeMs: number;
  
  // Quality
  successRate: number;
  errorRate: number;
  
  // Usage
  tokensPerMessage: number;
  costPerMessage: number;
  
  // AI Performance
  confidenceScores: number[];
  hitlTriggerCount: number;
}
```

---

## 10. Audit Logs Table

### 10.1 Audit Logs Table Overview

Tabel pentru vizualizarea și căutarea în jurnalul de audit al sistemului.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Jurnal Audit                                                        [Export ▼] [🔄]    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Caută în loguri...]  [Acțiune ▼] [Entitate ▼] [User ▼] [📅 Dată] [Severitate ▼]    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Timestamp          │ User          │ Acțiune      │ Entitate │ Detalii       │Severitate│
├────────────────────┼───────────────┼──────────────┼──────────┼───────────────┼──────────┤
│ 2026-01-19 14:32:01│ admin@cerniq  │ UPDATE       │ Offer    │ offer_abc123  │ ℹ️ Info  │
│                    │               │              │          │ discount: 15%→│          │
│                    │               │              │          │ 20%           │          │
├────────────────────┼───────────────┼──────────────┼──────────┼───────────────┼──────────┤
│ 2026-01-19 14:30:45│ ai_agent      │ CREATE       │ Message  │ msg_def456    │ ℹ️ Info  │
│                    │               │              │          │ Mesaj WhatsApp│          │
├────────────────────┼───────────────┼──────────────┼──────────┼───────────────┼──────────┤
│ 2026-01-19 14:28:12│ system        │ DELETE       │ Session  │ ses_ghi789    │ ⚠️ Warn  │
│                    │               │              │          │ Timeout cleanup│          │
├────────────────────┼───────────────┼──────────────┼──────────┼───────────────┼──────────┤
│ 2026-01-19 14:25:33│ user@agroplant│ LOGIN        │ Auth     │ IP: 86.123... │ ℹ️ Info  │
│                    │               │              │          │ Device: Chrome│          │
├────────────────────┼───────────────┼──────────────┼──────────┼───────────────┼──────────┤
│ 2026-01-19 14:20:00│ system        │ SECURITY     │ Auth     │ Failed login  │ 🔴 Error │
│                    │               │              │          │ 5 attempts    │          │
├────────────────────┴───────────────┴──────────────┴──────────┴───────────────┴──────────┤
│ Afișare 1-50 din 12,456 înregistrări                              [< Prev] [Next >]    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Audit Logs Table Implementation

```typescript
// components/tables/audit-logs-table.tsx
'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  flexRender,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  RefreshCw,
  Download,
  Eye,
  Calendar as CalendarIcon,
  Clock,
  User,
  Bot,
  Server,
  Shield,
  AlertTriangle,
  Info,
  AlertCircle,
  ChevronDown,
  ArrowUpDown,
  Filter,
  FileJson,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

import {
  AuditLog,
  AuditAction,
  AuditSeverity,
  EntityType,
  AuditLogsResponse,
} from '@/types/audit-log';
import { DataTablePagination } from './data-table-pagination';
import { DataTableFacetedFilter } from './data-table-faceted-filter';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Badge severitate
 */
interface SeverityBadgeProps {
  severity: AuditSeverity;
}

const severityConfig: Record<AuditSeverity, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ReactNode;
  className: string;
}> = {
  debug: {
    label: 'Debug',
    variant: 'outline',
    icon: <Info className="h-3 w-3" />,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  info: {
    label: 'Info',
    variant: 'secondary',
    icon: <Info className="h-3 w-3" />,
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  warning: {
    label: 'Warning',
    variant: 'outline',
    icon: <AlertTriangle className="h-3 w-3" />,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  error: {
    label: 'Error',
    variant: 'destructive',
    icon: <AlertCircle className="h-3 w-3" />,
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  critical: {
    label: 'Critical',
    variant: 'destructive',
    icon: <Shield className="h-3 w-3" />,
    className: 'bg-red-200 text-red-900 border-red-300',
  },
};

function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  
  return (
    <Badge variant={config.variant} className={cn('gap-1', config.className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

/**
 * Badge acțiune
 */
interface ActionBadgeProps {
  action: AuditAction;
}

const actionConfig: Record<AuditAction, {
  label: string;
  color: string;
}> = {
  CREATE: { label: 'CREATE', color: 'bg-green-100 text-green-700' },
  READ: { label: 'READ', color: 'bg-gray-100 text-gray-700' },
  UPDATE: { label: 'UPDATE', color: 'bg-blue-100 text-blue-700' },
  DELETE: { label: 'DELETE', color: 'bg-red-100 text-red-700' },
  LOGIN: { label: 'LOGIN', color: 'bg-purple-100 text-purple-700' },
  LOGOUT: { label: 'LOGOUT', color: 'bg-purple-50 text-purple-600' },
  EXPORT: { label: 'EXPORT', color: 'bg-orange-100 text-orange-700' },
  IMPORT: { label: 'IMPORT', color: 'bg-orange-100 text-orange-700' },
  APPROVE: { label: 'APPROVE', color: 'bg-green-100 text-green-700' },
  REJECT: { label: 'REJECT', color: 'bg-red-100 text-red-700' },
  SECURITY: { label: 'SECURITY', color: 'bg-red-200 text-red-800' },
  SYSTEM: { label: 'SYSTEM', color: 'bg-gray-200 text-gray-800' },
};

function ActionBadge({ action }: ActionBadgeProps) {
  const config = actionConfig[action];
  
  return (
    <Badge variant="outline" className={cn('font-mono text-xs', config.color)}>
      {config.label}
    </Badge>
  );
}

/**
 * Indicator actor (user/system/ai)
 */
interface ActorIndicatorProps {
  actor: AuditLog['actor'];
}

function ActorIndicator({ actor }: ActorIndicatorProps) {
  const icons = {
    user: <User className="h-4 w-4" />,
    system: <Server className="h-4 w-4" />,
    ai_agent: <Bot className="h-4 w-4" />,
  };
  
  const colors = {
    user: 'text-blue-600',
    system: 'text-gray-600',
    ai_agent: 'text-purple-600',
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <span className={colors[actor.type]}>{icons[actor.type]}</span>
          <span className="text-sm truncate max-w-[120px]">
            {actor.name || actor.id}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm space-y-1">
          <p><strong>ID:</strong> {actor.id}</p>
          {actor.email && <p><strong>Email:</strong> {actor.email}</p>}
          {actor.ipAddress && <p><strong>IP:</strong> {actor.ipAddress}</p>}
          {actor.userAgent && (
            <p className="text-xs text-muted-foreground max-w-[200px] truncate">
              {actor.userAgent}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Badge entitate
 */
interface EntityBadgeProps {
  entityType: EntityType;
  entityId?: string;
}

const entityConfig: Record<EntityType, {
  label: string;
  color: string;
}> = {
  Contact: { label: 'Contact', color: 'bg-blue-50 text-blue-700' },
  Conversation: { label: 'Conversație', color: 'bg-green-50 text-green-700' },
  Negotiation: { label: 'Negociere', color: 'bg-yellow-50 text-yellow-700' },
  Offer: { label: 'Ofertă', color: 'bg-purple-50 text-purple-700' },
  Order: { label: 'Comandă', color: 'bg-orange-50 text-orange-700' },
  Product: { label: 'Produs', color: 'bg-pink-50 text-pink-700' },
  Message: { label: 'Mesaj', color: 'bg-cyan-50 text-cyan-700' },
  Session: { label: 'Sesiune', color: 'bg-indigo-50 text-indigo-700' },
  Approval: { label: 'Aprobare', color: 'bg-emerald-50 text-emerald-700' },
  User: { label: 'User', color: 'bg-slate-50 text-slate-700' },
  Auth: { label: 'Auth', color: 'bg-red-50 text-red-700' },
  System: { label: 'System', color: 'bg-gray-50 text-gray-700' },
};

function EntityBadge({ entityType, entityId }: EntityBadgeProps) {
  const config = entityConfig[entityType];
  
  return (
    <div className="flex flex-col">
      <Badge variant="outline" className={cn('text-xs w-fit', config.color)}>
        {config.label}
      </Badge>
      {entityId && (
        <code className="text-xs text-muted-foreground mt-1 truncate max-w-[100px]">
          {entityId}
        </code>
      )}
    </div>
  );
}

/**
 * Dialog detalii log
 */
interface LogDetailsDialogProps {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LogDetailsDialog({ log, open, onOpenChange }: LogDetailsDialogProps) {
  if (!log) return null;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SeverityBadge severity={log.severity} />
            <span>Detalii Log Audit</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Timestamp</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-mono">
                  {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS', { locale: ro })}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Actor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ActorIndicator actor={log.actor} />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Action & Entity */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Acțiune</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionBadge action={log.action} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Entitate</CardTitle>
              </CardHeader>
              <CardContent>
                <EntityBadge entityType={log.entityType} entityId={log.entityId} />
              </CardContent>
            </Card>
          </div>
          
          {/* Description */}
          {log.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Descriere</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{log.description}</p>
              </CardContent>
            </Card>
          )}
          
          {/* Changes (Before/After) */}
          {log.changes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Modificări</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(log.changes, null, 2))}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiază
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {log.changes.before && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Înainte:</p>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[200px]">
                        {JSON.stringify(log.changes.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.changes.after && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">După:</p>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[200px]">
                        {JSON.stringify(log.changes.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Metadata</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(log.metadata, null, 2))}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiază
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[200px]">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
          
          {/* Request Info */}
          {log.request && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Detalii Request</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>Method:</strong> {log.request.method}</p>
                  <p><strong>Path:</strong> {log.request.path}</p>
                  {log.request.statusCode && (
                    <p><strong>Status:</strong> {log.request.statusCode}</p>
                  )}
                  {log.request.duration && (
                    <p><strong>Durată:</strong> {log.request.duration}ms</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Hash Chain Verification */}
          {log.hashChain && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Verificare Integritate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm font-mono">
                  <p className="truncate">
                    <strong>Hash:</strong> {log.hashChain.currentHash}
                  </p>
                  <p className="truncate">
                    <strong>Previous:</strong> {log.hashChain.previousHash}
                  </p>
                  <Badge
                    variant={log.hashChain.verified ? 'default' : 'destructive'}
                    className={log.hashChain.verified 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                    }
                  >
                    {log.hashChain.verified ? '✓ Verificat' : '✗ Invalid'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MAIN TABLE COMPONENT
// =============================================================================

interface AuditLogsTableProps {
  entityType?: EntityType;
  entityId?: string;
  className?: string;
}

export function AuditLogsTable({ entityType, entityId, className }: AuditLogsTableProps) {
  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timestamp', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Date range filter
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  
  // Pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });
  
  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(pagination.pageIndex + 1),
      pageSize: String(pagination.pageSize),
    };
    
    if (entityType) params.entityType = entityType;
    if (entityId) params.entityId = entityId;
    
    if (sorting.length > 0) {
      params.sortBy = sorting[0].id;
      params.sortOrder = sorting[0].desc ? 'desc' : 'asc';
    }
    
    if (globalFilter) params.search = globalFilter;
    
    if (dateRange?.from) {
      params.dateFrom = dateRange.from.toISOString();
    }
    if (dateRange?.to) {
      params.dateTo = dateRange.to.toISOString();
    }
    
    columnFilters.forEach((filter) => {
      if (Array.isArray(filter.value)) {
        params[filter.id] = filter.value.join(',');
      } else {
        params[filter.id] = String(filter.value);
      }
    });
    
    return new URLSearchParams(params).toString();
  }, [entityType, entityId, sorting, columnFilters, globalFilter, dateRange, pagination]);
  
  // Fetch logs
  const { data, isLoading, error, refetch } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/v1/audit-logs?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
    staleTime: 30000, // 30s
  });
  
  // Export mutation
  const handleExport = async (format: 'json' | 'csv') => {
    const response = await fetch(`/api/v1/audit-logs/export?${queryParams}&format=${format}`);
    if (!response.ok) throw new Error('Export failed');
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Column definitions
  const columns: ColumnDef<AuditLog>[] = useMemo(() => [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Timestamp
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const timestamp = new Date(row.original.timestamp);
        return (
          <Tooltip>
            <TooltipTrigger className="text-sm font-mono">
              {format(timestamp, 'HH:mm:ss')}
              <span className="text-muted-foreground ml-1">
                {format(timestamp, 'dd/MM')}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {format(timestamp, 'yyyy-MM-dd HH:mm:ss.SSS', { locale: ro })}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: 'actor',
      header: 'Actor',
      cell: ({ row }) => (
        <ActorIndicator actor={row.original.actor} />
      ),
    },
    {
      accessorKey: 'action',
      header: 'Acțiune',
      cell: ({ row }) => (
        <ActionBadge action={row.original.action} />
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'entityType',
      header: 'Entitate',
      cell: ({ row }) => (
        <EntityBadge 
          entityType={row.original.entityType}
          entityId={row.original.entityId}
        />
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'description',
      header: 'Detalii',
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
          {row.original.description || '-'}
        </p>
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Severitate',
      cell: ({ row }) => (
        <SeverityBadge severity={row.original.severity} />
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedLog(row.original);
            setDetailsOpen(true);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ], []);
  
  // Table instance
  const table = useReactTable({
    data: data?.logs ?? [],
    columns,
    pageCount: data?.pagination.totalPages ?? -1,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  
  // Filter options
  const actionOptions = Object.entries(actionConfig).map(([value, { label }]) => ({
    label,
    value,
  }));
  
  const entityOptions = Object.entries(entityConfig).map(([value, { label }]) => ({
    label,
    value,
  }));
  
  const severityOptions = Object.entries(severityConfig).map(([value, { label }]) => ({
    label,
    value,
  }));
  
  if (error) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-destructive mb-4">Eroare la încărcarea log-urilor</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reîncearcă
        </Button>
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută în loguri..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Filters */}
          <DataTableFacetedFilter
            column={table.getColumn('action')}
            title="Acțiune"
            options={actionOptions}
          />
          
          <DataTableFacetedFilter
            column={table.getColumn('entityType')}
            title="Entitate"
            options={entityOptions}
          />
          
          <DataTableFacetedFilter
            column={table.getColumn('severity')}
            title="Severitate"
            options={severityOptions}
          />
          
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd MMM', { locale: ro })} -{' '}
                      {format(dateRange.to, 'dd MMM', { locale: ro })}
                    </>
                  ) : (
                    format(dateRange.from, 'dd MMM yyyy', { locale: ro })
                  )
                ) : (
                  'Selectează perioada'
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ro}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="h-4 w-4 mr-2" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileJson className="h-4 w-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Refresh */}
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>
      
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    row.original.severity === 'critical' && 'bg-red-50',
                    row.original.severity === 'error' && 'bg-red-50/50'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nu există înregistrări în jurnal
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Afișare {pagination.pageIndex * pagination.pageSize + 1}-
          {Math.min((pagination.pageIndex + 1) * pagination.pageSize, data?.pagination.total ?? 0)}{' '}
          din {data?.pagination.total?.toLocaleString('ro-RO')} înregistrări
        </p>
        <DataTablePagination table={table} />
      </div>
      
      {/* Details Dialog */}
      <LogDetailsDialog
        log={selectedLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
```

### 10.3 Audit Log Types

```typescript
// types/audit-log.ts

/**
 * Acțiuni audit
 */
export type AuditAction =
  | 'CREATE'    // Creare entitate
  | 'READ'      // Citire/Vizualizare
  | 'UPDATE'    // Modificare
  | 'DELETE'    // Ștergere
  | 'LOGIN'     // Autentificare reușită
  | 'LOGOUT'    // Deconectare
  | 'EXPORT'    // Export date
  | 'IMPORT'    // Import date
  | 'APPROVE'   // Aprobare HITL
  | 'REJECT'    // Respingere HITL
  | 'SECURITY'  // Eveniment securitate
  | 'SYSTEM';   // Acțiune sistem

/**
 * Severitate log
 */
export type AuditSeverity =
  | 'debug'     // Debug/dezvoltare
  | 'info'      // Informațional
  | 'warning'   // Avertizare
  | 'error'     // Eroare
  | 'critical'; // Critic (securitate)

/**
 * Tipuri entități
 */
export type EntityType =
  | 'Contact'
  | 'Conversation'
  | 'Negotiation'
  | 'Offer'
  | 'Order'
  | 'Product'
  | 'Message'
  | 'Session'
  | 'Approval'
  | 'User'
  | 'Auth'
  | 'System';

/**
 * Actor - cine a efectuat acțiunea
 */
export interface AuditActor {
  type: 'user' | 'system' | 'ai_agent';
  id: string;
  name?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

/**
 * Modificări - before/after
 */
export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}

/**
 * Request info
 */
export interface AuditRequestInfo {
  method: string;
  path: string;
  query?: Record<string, string>;
  statusCode?: number;
  duration?: number;
  requestId?: string;
}

/**
 * Hash chain pentru integritate
 */
export interface AuditHashChain {
  currentHash: string;
  previousHash: string;
  verified: boolean;
  algorithm: 'sha256';
}

/**
 * Interfață principală Audit Log
 */
export interface AuditLog {
  id: string;
  tenantId: string;
  
  // Acțiune
  action: AuditAction;
  severity: AuditSeverity;
  
  // Actor
  actor: AuditActor;
  
  // Target
  entityType: EntityType;
  entityId?: string;
  
  // Descriere
  description?: string;
  
  // Modificări
  changes?: AuditChanges;
  
  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];
  
  // Request
  request?: AuditRequestInfo;
  
  // Integritate
  hashChain?: AuditHashChain;
  
  // Timing
  timestamp: string;
  
  // Indexare
  searchableText?: string;
}

/**
 * Response paginat
 */
export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    byAction: Record<AuditAction, number>;
    bySeverity: Record<AuditSeverity, number>;
    byEntityType: Record<EntityType, number>;
    timeRange: {
      from: string;
      to: string;
    };
  };
}

/**
 * Filtru pentru query
 */
export interface AuditLogsFilter {
  actions?: AuditAction[];
  severities?: AuditSeverity[];
  entityTypes?: EntityType[];
  entityId?: string;
  actorId?: string;
  actorType?: 'user' | 'system' | 'ai_agent';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  tags?: string[];
}

/**
 * Request creare log audit (intern)
 */
export interface CreateAuditLogRequest {
  action: AuditAction;
  severity?: AuditSeverity;
  entityType: EntityType;
  entityId?: string;
  description?: string;
  changes?: AuditChanges;
  metadata?: Record<string, unknown>;
  tags?: string[];
}
```

---

## 11. Performance Metrics Table

### 11.1 Performance Metrics Table Overview

Tabel pentru monitorizarea metricilor de performanță ale sistemului și pipeline-urilor.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Metrici Performanță                                          [Ultima oră ▼] [🔄 Live]  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ [Worker ▼] [Tip Metric ▼] [Status ▼] [Threshold ▼]                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Componentă         │ Metric            │ Valoare    │ Trend  │ P95    │ Status         │
├────────────────────┼───────────────────┼────────────┼────────┼────────┼────────────────┤
│ 🤖 AI Sales Agent  │ Response Time     │ 1,234 ms   │ ↗️ +5%  │ 2,100  │ 🟢 Normal      │
│                    │ Tokens/min        │ 12,456     │ ↘️ -2%  │ 15,000 │ 🟢 Normal      │
│                    │ Cost/hour         │ $2.34      │ ↗️ +8%  │ $5.00  │ 🟢 Normal      │
├────────────────────┼───────────────────┼────────────┼────────┼────────┼────────────────┤
│ 📧 Email Worker    │ Send Rate         │ 45/min     │ ↗️ +12% │ 60     │ 🟢 Normal      │
│                    │ Bounce Rate       │ 2.3%       │ ↘️ -1%  │ 5%     │ 🟢 Normal      │
│                    │ Open Rate         │ 34.5%      │ →       │ -      │ 🟢 Normal      │
├────────────────────┼───────────────────┼────────────┼────────┼────────┼────────────────┤
│ 💬 WhatsApp Worker │ Message Latency   │ 890 ms     │ ↗️ +15% │ 1,500  │ 🟡 Warning     │
│                    │ Delivery Rate     │ 98.7%      │ →       │ 95%    │ 🟢 Normal      │
├────────────────────┼───────────────────┼────────────┼────────┼────────┼────────────────┤
│ 🔄 HITL Processor  │ Approval Time     │ 4.2 min    │ ↘️ -3%  │ 15 min │ 🟢 Normal      │
│                    │ SLA Breach Rate   │ 1.2%       │ ↗️ +0.5%│ 5%     │ 🟢 Normal      │
├────────────────────┼───────────────────┼────────────┼────────┼────────┼────────────────┤
│ 📊 Pipeline Total  │ Throughput        │ 1,234/h    │ ↗️ +10% │ 2,000  │ 🟢 Normal      │
│                    │ Error Rate        │ 0.8%       │ ↘️ -0.2%│ 2%     │ 🟢 Normal      │
│                    │ Queue Depth       │ 145        │ ↗️ +25% │ 500    │ 🟡 Warning     │
├────────────────────┴───────────────────┴────────────┴────────┴────────┴────────────────┤
│ 📈 Healthy: 12/14 metrics | ⚠️ Warning: 2 | 🔴 Critical: 0                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Performance Metrics Table Implementation

```typescript
// components/tables/performance-metrics-table.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  flexRender,
  Row,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Bot,
  Mail,
  MessageSquare,
  Phone,
  Zap,
  Clock,
  DollarSign,
  BarChart3,
  Timer,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  PerformanceMetric,
  MetricStatus,
  MetricTrend,
  ComponentType,
  MetricType,
  PerformanceMetricsResponse,
} from '@/types/performance-metric';
import { DataTableFacetedFilter } from './data-table-faceted-filter';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Icoane componente
 */
const componentIcons: Record<ComponentType, React.ReactNode> = {
  ai_sales_agent: <Bot className="h-4 w-4 text-purple-500" />,
  email_worker: <Mail className="h-4 w-4 text-blue-500" />,
  whatsapp_worker: <MessageSquare className="h-4 w-4 text-green-500" />,
  phone_worker: <Phone className="h-4 w-4 text-orange-500" />,
  hitl_processor: <Users className="h-4 w-4 text-indigo-500" />,
  offer_generator: <Zap className="h-4 w-4 text-yellow-500" />,
  pipeline: <Activity className="h-4 w-4 text-gray-500" />,
  api: <BarChart3 className="h-4 w-4 text-cyan-500" />,
  database: <BarChart3 className="h-4 w-4 text-red-500" />,
  queue: <Timer className="h-4 w-4 text-pink-500" />,
};

/**
 * Indicator status metric
 */
interface MetricStatusIndicatorProps {
  status: MetricStatus;
  animate?: boolean;
}

function MetricStatusIndicator({ status, animate = true }: MetricStatusIndicatorProps) {
  const config = {
    healthy: {
      icon: <CheckCircle className="h-4 w-4" />,
      label: 'Normal',
      className: 'text-green-600',
      bgClassName: 'bg-green-100',
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4" />,
      label: 'Warning',
      className: 'text-yellow-600',
      bgClassName: 'bg-yellow-100',
    },
    critical: {
      icon: <XCircle className="h-4 w-4" />,
      label: 'Critical',
      className: 'text-red-600',
      bgClassName: 'bg-red-100',
    },
    unknown: {
      icon: <Minus className="h-4 w-4" />,
      label: 'Unknown',
      className: 'text-gray-600',
      bgClassName: 'bg-gray-100',
    },
  }[status];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1',
        config.bgClassName,
        config.className,
        animate && status === 'critical' && 'animate-pulse'
      )}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

/**
 * Indicator trend
 */
interface TrendIndicatorProps {
  trend: MetricTrend;
  percentChange?: number;
  invertColors?: boolean; // Pentru metrici unde scădere = bine (ex: error rate)
}

function TrendIndicator({ trend, percentChange, invertColors = false }: TrendIndicatorProps) {
  const getColor = () => {
    if (trend === 'stable') return 'text-gray-500';
    
    const isPositiveChange = trend === 'up';
    const isGood = invertColors ? !isPositiveChange : isPositiveChange;
    
    return isGood ? 'text-green-600' : 'text-red-600';
  };
  
  const icons = {
    up: <TrendingUp className="h-4 w-4" />,
    down: <TrendingDown className="h-4 w-4" />,
    stable: <Minus className="h-4 w-4" />,
  };
  
  return (
    <div className={cn('flex items-center gap-1 text-sm', getColor())}>
      {icons[trend]}
      {percentChange !== undefined && (
        <span className="font-mono">
          {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

/**
 * Indicator valoare metric cu formatare
 */
interface MetricValueProps {
  value: number;
  unit: string;
  decimals?: number;
}

function MetricValue({ value, unit, decimals = 0 }: MetricValueProps) {
  const formatValue = (val: number, u: string) => {
    // Format based on unit type
    if (u === 'ms' || u === 'seconds') {
      if (val >= 60000) {
        return `${(val / 60000).toFixed(1)} min`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)} s`;
      }
      return `${val.toFixed(0)} ms`;
    }
    
    if (u === '%') {
      return `${val.toFixed(decimals || 1)}%`;
    }
    
    if (u === 'USD' || u === '$') {
      return `$${val.toFixed(2)}`;
    }
    
    if (u === '/min' || u === '/hour' || u === '/sec') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M${u}`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K${u}`;
      }
      return `${val.toFixed(0)}${u}`;
    }
    
    // Default number formatting
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toFixed(decimals);
  };
  
  return (
    <span className="font-mono text-sm font-medium">
      {formatValue(value, unit)}
    </span>
  );
}

/**
 * Progress bar pentru threshold
 */
interface ThresholdProgressProps {
  value: number;
  threshold: number;
  unit: string;
  invertThreshold?: boolean; // True dacă sub threshold = bine
}

function ThresholdProgress({ 
  value, 
  threshold, 
  unit,
  invertThreshold = false 
}: ThresholdProgressProps) {
  const percentage = Math.min((value / threshold) * 100, 100);
  
  const getColor = () => {
    if (invertThreshold) {
      // Pentru metrici unde mai mic = mai bine (error rate)
      if (percentage >= 80) return 'bg-red-500';
      if (percentage >= 60) return 'bg-yellow-500';
      return 'bg-green-500';
    } else {
      // Pentru metrici unde mai mare poate fi rău (latency)
      if (percentage >= 80) return 'bg-red-500';
      if (percentage >= 60) return 'bg-yellow-500';
      return 'bg-green-500';
    }
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress 
            value={percentage} 
            className="h-2 flex-1"
            indicatorClassName={getColor()}
          />
          <span className="text-xs text-muted-foreground font-mono w-12 text-right">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Threshold: {threshold} {unit}</p>
        <p>Current: {value} {unit}</p>
        <p>Usage: {percentage.toFixed(1)}%</p>
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// MAIN TABLE COMPONENT
// =============================================================================

interface PerformanceMetricsTableProps {
  componentFilter?: ComponentType;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export function PerformanceMetricsTable({ 
  componentFilter,
  autoRefresh = true,
  refreshInterval = 30000, // 30s default
  className 
}: PerformanceMetricsTableProps) {
  // Time range state
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  
  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  // Live indicator
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Fetch metrics
  const { data, isLoading, error, refetch } = useQuery<PerformanceMetricsResponse>({
    queryKey: ['performance-metrics', componentFilter, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({ timeRange });
      if (componentFilter) params.set('component', componentFilter);
      
      const response = await fetch(`/api/v1/metrics/performance?${params}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    staleTime: 10000,
    refetchInterval: autoRefresh ? refreshInterval : false,
    onSuccess: () => {
      setLastUpdated(new Date());
    },
  });
  
  // Column definitions
  const columns: ColumnDef<PerformanceMetric>[] = useMemo(() => [
    {
      accessorKey: 'component',
      header: 'Componentă',
      cell: ({ row }) => {
        const component = row.original.component;
        const icon = componentIcons[component.type];
        
        return (
          <div className="flex items-center gap-2">
            {icon}
            <div className="flex flex-col">
              <span className="font-medium text-sm">{component.name}</span>
              <span className="text-xs text-muted-foreground">
                {component.type.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.original.component.type);
      },
    },
    {
      accessorKey: 'name',
      header: 'Metric',
      cell: ({ row }) => {
        const metric = row.original;
        const typeIcons: Record<MetricType, React.ReactNode> = {
          latency: <Clock className="h-3 w-3" />,
          throughput: <Activity className="h-3 w-3" />,
          error_rate: <AlertTriangle className="h-3 w-3" />,
          cost: <DollarSign className="h-3 w-3" />,
          usage: <BarChart3 className="h-3 w-3" />,
          queue_depth: <Timer className="h-3 w-3" />,
          success_rate: <CheckCircle className="h-3 w-3" />,
        };
        
        return (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {typeIcons[metric.type]}
            </span>
            <span className="text-sm">{metric.displayName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'value',
      header: 'Valoare',
      cell: ({ row }) => (
        <MetricValue 
          value={row.original.value} 
          unit={row.original.unit}
          decimals={row.original.decimals}
        />
      ),
    },
    {
      accessorKey: 'trend',
      header: 'Trend',
      cell: ({ row }) => (
        <TrendIndicator 
          trend={row.original.trend}
          percentChange={row.original.percentChange}
          invertColors={row.original.type === 'error_rate'}
        />
      ),
    },
    {
      id: 'p95',
      header: 'P95',
      cell: ({ row }) => {
        const metric = row.original;
        if (!metric.percentiles?.p95) return <span className="text-muted-foreground">-</span>;
        
        return (
          <MetricValue 
            value={metric.percentiles.p95} 
            unit={metric.unit}
          />
        );
      },
    },
    {
      id: 'threshold',
      header: 'Threshold',
      cell: ({ row }) => {
        const metric = row.original;
        if (!metric.threshold) return <span className="text-muted-foreground">-</span>;
        
        return (
          <ThresholdProgress
            value={metric.value}
            threshold={metric.threshold.value}
            unit={metric.unit}
            invertThreshold={metric.type === 'error_rate'}
          />
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <MetricStatusIndicator status={row.original.status} />
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
  ], []);
  
  // Table instance
  const table = useReactTable({
    data: data?.metrics ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  
  // Filter options
  const componentOptions = [
    { label: 'AI Sales Agent', value: 'ai_sales_agent' },
    { label: 'Email Worker', value: 'email_worker' },
    { label: 'WhatsApp Worker', value: 'whatsapp_worker' },
    { label: 'Phone Worker', value: 'phone_worker' },
    { label: 'HITL Processor', value: 'hitl_processor' },
    { label: 'Offer Generator', value: 'offer_generator' },
    { label: 'Pipeline', value: 'pipeline' },
    { label: 'API', value: 'api' },
    { label: 'Database', value: 'database' },
    { label: 'Queue', value: 'queue' },
  ];
  
  const statusOptions = [
    { label: 'Healthy', value: 'healthy', icon: CheckCircle },
    { label: 'Warning', value: 'warning', icon: AlertTriangle },
    { label: 'Critical', value: 'critical', icon: XCircle },
  ];
  
  // Summary stats
  const summary = data?.summary ?? {
    healthy: 0,
    warning: 0,
    critical: 0,
    total: 0,
  };
  
  if (error) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-destructive mb-4">Eroare la încărcarea metricilor</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reîncearcă
        </Button>
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-green-50 text-green-700 gap-1">
            <CheckCircle className="h-3 w-3" />
            Healthy: {summary.healthy}
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Warning: {summary.warning}
          </Badge>
          <Badge variant="outline" className="bg-red-50 text-red-700 gap-1">
            <XCircle className="h-3 w-3" />
            Critical: {summary.critical}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {autoRefresh && (
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3 animate-pulse text-green-500" />
              Live
            </Badge>
          )}
          <span>
            Actualizat: {lastUpdated.toLocaleTimeString('ro-RO')}
          </span>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <DataTableFacetedFilter
            column={table.getColumn('component')}
            title="Componentă"
            options={componentOptions}
          />
          
          <DataTableFacetedFilter
            column={table.getColumn('status')}
            title="Status"
            options={statusOptions}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Perioadă" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Ultima oră</SelectItem>
              <SelectItem value="6h">Ultimele 6h</SelectItem>
              <SelectItem value="24h">Ultimele 24h</SelectItem>
              <SelectItem value="7d">Ultimele 7 zile</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>
      
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    row.original.status === 'critical' && 'bg-red-50',
                    row.original.status === 'warning' && 'bg-yellow-50/50'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nu există metrici disponibile
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

### 11.3 Performance Metric Types

```typescript
// types/performance-metric.ts

/**
 * Tipuri componente monitorizate
 */
export type ComponentType =
  | 'ai_sales_agent'
  | 'email_worker'
  | 'whatsapp_worker'
  | 'phone_worker'
  | 'hitl_processor'
  | 'offer_generator'
  | 'pipeline'
  | 'api'
  | 'database'
  | 'queue';

/**
 * Tipuri metrici
 */
export type MetricType =
  | 'latency'       // Timp de răspuns
  | 'throughput'    // Debit/Rată
  | 'error_rate'    // Rată erori
  | 'cost'          // Cost
  | 'usage'         // Utilizare resurse
  | 'queue_depth'   // Adâncime coadă
  | 'success_rate'; // Rată succes

/**
 * Status metric
 */
export type MetricStatus = 
  | 'healthy'   // Verde - în parametri normali
  | 'warning'   // Galben - aproape de threshold
  | 'critical'  // Roșu - depășit threshold
  | 'unknown';  // Gri - date insuficiente

/**
 * Trend metric
 */
export type MetricTrend = 
  | 'up'      // Creștere
  | 'down'    // Scădere
  | 'stable'; // Stabil

/**
 * Componentă monitorizată
 */
export interface MetricComponent {
  type: ComponentType;
  name: string;
  instanceId?: string;
  version?: string;
}

/**
 * Configurare threshold
 */
export interface MetricThreshold {
  value: number;
  warningValue?: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  unit: string;
}

/**
 * Percentile metrici
 */
export interface MetricPercentiles {
  p50?: number;
  p75?: number;
  p90?: number;
  p95?: number;
  p99?: number;
}

/**
 * Interfață principală Performance Metric
 */
export interface PerformanceMetric {
  id: string;
  name: string;
  displayName: string;
  
  // Componentă
  component: MetricComponent;
  
  // Tip și valoare
  type: MetricType;
  value: number;
  unit: string;
  decimals?: number;
  
  // Trend
  trend: MetricTrend;
  percentChange?: number;
  previousValue?: number;
  
  // Percentile
  percentiles?: MetricPercentiles;
  
  // Threshold
  threshold?: MetricThreshold;
  
  // Status derivat
  status: MetricStatus;
  
  // Timestamp
  timestamp: string;
  
  // Metadata
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Response paginat metrici
 */
export interface PerformanceMetricsResponse {
  metrics: PerformanceMetric[];
  summary: {
    healthy: number;
    warning: number;
    critical: number;
    total: number;
    byComponent: Record<ComponentType, {
      healthy: number;
      warning: number;
      critical: number;
    }>;
  };
  timeRange: {
    from: string;
    to: string;
    granularity: 'minute' | 'hour' | 'day';
  };
}

/**
 * Istoric metric pentru grafice
 */
export interface MetricHistory {
  metricId: string;
  values: Array<{
    timestamp: string;
    value: number;
    percentiles?: MetricPercentiles;
  }>;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'p95';
}

/**
 * Alertă metric
 */
export interface MetricAlert {
  id: string;
  metricId: string;
  metric: PerformanceMetric;
  
  severity: 'warning' | 'critical';
  message: string;
  
  triggeredAt: string;
  resolvedAt?: string;
  
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

/**
 * Dashboard metrici sumar
 */
export interface MetricsDashboardSummary {
  overallHealth: 'healthy' | 'degraded' | 'critical';
  
  aiAgent: {
    status: MetricStatus;
    responseTime: number;
    tokensUsed: number;
    costToday: number;
  };
  
  outreach: {
    status: MetricStatus;
    emailsSent: number;
    whatsappSent: number;
    deliveryRate: number;
  };
  
  hitl: {
    status: MetricStatus;
    pendingApprovals: number;
    avgApprovalTime: number;
    slaBreachRate: number;
  };
  
  pipeline: {
    status: MetricStatus;
    throughput: number;
    errorRate: number;
    queueDepth: number;
  };
}
```

---

## 12. Shared Table Components

### 12.1 Empty State Component

```typescript
// components/tables/shared/empty-state.tsx
'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

### 12.2 Loading Skeleton Component

```typescript
// components/tables/shared/table-skeleton.tsx
'use client';

import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
  className?: string;
}

export function TableSkeleton({ 
  columns, 
  rows = 5,
  className 
}: TableSkeletonProps) {
  return (
    <TableBody className={className}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, cellIndex) => (
            <TableCell key={cellIndex}>
              <div 
                className={cn(
                  'h-4 bg-muted animate-pulse rounded',
                  cellIndex === 0 && 'w-24',
                  cellIndex === columns - 1 && 'w-16',
                )}
                style={{
                  animationDelay: `${(rowIndex * columns + cellIndex) * 50}ms`,
                }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
```

### 12.3 Error State Component

```typescript
// components/tables/shared/error-state.tsx
'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Eroare la încărcarea datelor',
  message = 'A apărut o eroare. Vă rugăm încercați din nou.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" className={cn('my-4', className)}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncearcă
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

### 12.4 Bulk Actions Toolbar

```typescript
// components/tables/shared/bulk-actions-toolbar.tsx
'use client';

import { useState } from 'react';
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronDown, X, Trash2, Archive, Download, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  onExecute: (selectedIds: string[]) => Promise<void>;
}

interface BulkActionsToolbarProps<TData> {
  table: Table<TData>;
  actions: BulkAction[];
  getRowId: (row: TData) => string;
  className?: string;
}

export function BulkActionsToolbar<TData>({
  table,
  actions,
  getRowId,
  className,
}: BulkActionsToolbarProps<TData>) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: BulkAction | null;
  }>({ open: false, action: null });
  const [isExecuting, setIsExecuting] = useState(false);
  
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  
  if (selectedCount === 0) return null;
  
  const selectedIds = selectedRows.map((row) => getRowId(row.original));
  
  const handleActionClick = async (action: BulkAction) => {
    if (action.requiresConfirmation) {
      setConfirmDialog({ open: true, action });
    } else {
      await executeAction(action);
    }
  };
  
  const executeAction = async (action: BulkAction) => {
    setIsExecuting(true);
    try {
      await action.onExecute(selectedIds);
      table.resetRowSelection();
    } finally {
      setIsExecuting(false);
      setConfirmDialog({ open: false, action: null });
    }
  };
  
  return (
    <>
      <div className={cn(
        'flex items-center gap-2 p-2 bg-muted/50 rounded-lg',
        className
      )}>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{selectedCount}</span>
          <span className="text-muted-foreground">
            {selectedCount === 1 ? 'element selectat' : 'elemente selectate'}
          </span>
        </div>
        
        <div className="flex-1" />
        
        {/* Quick actions */}
        {actions.slice(0, 2).map((action) => (
          <Button
            key={action.id}
            variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => handleActionClick(action)}
            disabled={isExecuting}
          >
            {action.icon}
            <span className="ml-2">{action.label}</span>
          </Button>
        ))}
        
        {/* More actions dropdown */}
        {actions.length > 2 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Mai multe
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.slice(2).map((action, index) => (
                <div key={action.id}>
                  {index > 0 && action.variant === 'destructive' && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem
                    onClick={() => handleActionClick(action)}
                    className={cn(
                      action.variant === 'destructive' && 'text-destructive'
                    )}
                  >
                    {action.icon}
                    <span className="ml-2">{action.label}</span>
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {/* Clear selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.resetRowSelection()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, action: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare acțiune</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action?.confirmationMessage || 
                `Sunteți sigur că doriți să aplicați "${confirmDialog.action?.label}" pentru ${selectedCount} elemente?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExecuting}>
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog.action && executeAction(confirmDialog.action)}
              disabled={isExecuting}
              className={cn(
                confirmDialog.action?.variant === 'destructive' && 
                'bg-destructive hover:bg-destructive/90'
              )}
            >
              {isExecuting ? 'Se procesează...' : 'Confirmă'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### 12.5 Row Actions Menu

```typescript
// components/tables/shared/row-actions-menu.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RowAction<TData> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: boolean | ((row: TData) => boolean);
  hidden?: boolean | ((row: TData) => boolean);
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationMessage?: string | ((row: TData) => string);
  onExecute: (row: TData) => Promise<void> | void;
}

interface RowActionsMenuProps<TData> {
  row: TData;
  actions: RowAction<TData>[];
  label?: string;
}

export function RowActionsMenu<TData>({
  row,
  actions,
  label = 'Acțiuni',
}: RowActionsMenuProps<TData>) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: RowAction<TData> | null;
  }>({ open: false, action: null });
  const [isExecuting, setIsExecuting] = useState(false);
  
  const visibleActions = actions.filter((action) => {
    if (typeof action.hidden === 'function') {
      return !action.hidden(row);
    }
    return !action.hidden;
  });
  
  if (visibleActions.length === 0) return null;
  
  const getDisabled = (action: RowAction<TData>) => {
    if (typeof action.disabled === 'function') {
      return action.disabled(row);
    }
    return action.disabled;
  };
  
  const handleActionClick = async (action: RowAction<TData>) => {
    if (action.requiresConfirmation) {
      setConfirmDialog({ open: true, action });
    } else {
      await executeAction(action);
    }
  };
  
  const executeAction = async (action: RowAction<TData>) => {
    setIsExecuting(true);
    try {
      await action.onExecute(row);
    } finally {
      setIsExecuting(false);
      setConfirmDialog({ open: false, action: null });
    }
  };
  
  const getConfirmationMessage = (action: RowAction<TData>) => {
    if (typeof action.confirmationMessage === 'function') {
      return action.confirmationMessage(row);
    }
    return action.confirmationMessage || 'Sunteți sigur că doriți să continuați?';
  };
  
  // Group actions by variant
  const defaultActions = visibleActions.filter((a) => a.variant !== 'destructive');
  const destructiveActions = visibleActions.filter((a) => a.variant === 'destructive');
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Deschide meniu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          
          {defaultActions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={getDisabled(action) || isExecuting}
            >
              {action.icon}
              <span className={action.icon ? 'ml-2' : ''}>{action.label}</span>
            </DropdownMenuItem>
          ))}
          
          {destructiveActions.length > 0 && defaultActions.length > 0 && (
            <DropdownMenuSeparator />
          )}
          
          {destructiveActions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={getDisabled(action) || isExecuting}
              className="text-destructive focus:text-destructive"
            >
              {action.icon}
              <span className={action.icon ? 'ml-2' : ''}>{action.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, action: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action?.confirmationTitle || 'Confirmare'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action && getConfirmationMessage(confirmDialog.action)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExecuting}>
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog.action && executeAction(confirmDialog.action)}
              disabled={isExecuting}
              className={cn(
                confirmDialog.action?.variant === 'destructive' && 
                'bg-destructive hover:bg-destructive/90'
              )}
            >
              {isExecuting ? 'Se procesează...' : 'Confirmă'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### 12.6 Column Toggle Component

```typescript
// components/tables/shared/column-toggle.tsx
'use client';

import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';

interface ColumnToggleProps<TData> {
  table: Table<TData>;
  columnLabels?: Record<string, string>;
}

export function ColumnToggle<TData>({
  table,
  columnLabels = {},
}: ColumnToggleProps<TData>) {
  const columns = table
    .getAllColumns()
    .filter((column) => column.getCanHide());
  
  if (columns.length === 0) return null;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Coloane
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Vizibilitate coloane</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => {
          const label = columnLabels[column.id] || column.id;
          
          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(value)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={columns.every((c) => c.getIsVisible())}
          onCheckedChange={(value) => {
            columns.forEach((c) => c.toggleVisibility(value));
          }}
        >
          {columns.every((c) => c.getIsVisible()) 
            ? 'Ascunde toate' 
            : 'Arată toate'}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 12.7 Export Button Component

```typescript
// components/tables/shared/export-button.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

interface ExportButtonProps {
  onExport: (format: ExportFormat) => Promise<void>;
  formats?: ExportFormat[];
  disabled?: boolean;
  className?: string;
}

const formatConfig: Record<ExportFormat, {
  label: string;
  icon: React.ReactNode;
}> = {
  csv: {
    label: 'Export CSV',
    icon: <FileText className="h-4 w-4" />,
  },
  xlsx: {
    label: 'Export Excel',
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
  json: {
    label: 'Export JSON',
    icon: <FileJson className="h-4 w-4" />,
  },
  pdf: {
    label: 'Export PDF',
    icon: <FileText className="h-4 w-4" />,
  },
};

export function ExportButton({
  onExport,
  formats = ['csv', 'xlsx', 'json'],
  disabled = false,
  className,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format);
    try {
      await onExport(format);
    } finally {
      setIsExporting(null);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled || isExporting !== null}
          className={className}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((format) => {
          const config = formatConfig[format];
          const isCurrentFormat = isExporting === format;
          
          return (
            <DropdownMenuItem
              key={format}
              onClick={() => handleExport(format)}
              disabled={isExporting !== null}
            >
              {isCurrentFormat ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <span className="mr-2">{config.icon}</span>
              )}
              {config.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 13. State Management Patterns

### 13.1 Table State Hook

```typescript
// hooks/use-table-state.ts
'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  PaginationState,
} from '@tanstack/react-table';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface UseTableStateOptions {
  // Defaults
  defaultSorting?: SortingState;
  defaultColumnFilters?: ColumnFiltersState;
  defaultColumnVisibility?: VisibilityState;
  defaultPagination?: PaginationState;
  
  // Sync cu URL
  syncWithUrl?: boolean;
  
  // Keys pentru URL params
  urlKeys?: {
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
    filters?: string;
  };
}

interface TableState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
  pagination: PaginationState;
  globalFilter: string;
}

interface TableStateActions {
  setSorting: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  setColumnFilters: (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => void;
  setColumnVisibility: (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => void;
  setRowSelection: (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => void;
  setPagination: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void;
  setGlobalFilter: (value: string) => void;
  resetState: () => void;
  resetFilters: () => void;
  resetSelection: () => void;
}

export function useTableState(options: UseTableStateOptions = {}): [TableState, TableStateActions] {
  const {
    defaultSorting = [],
    defaultColumnFilters = [],
    defaultColumnVisibility = {},
    defaultPagination = { pageIndex: 0, pageSize: 20 },
    syncWithUrl = false,
    urlKeys = {},
  } = options;
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize state from URL if syncing
  const initialState = useMemo(() => {
    if (!syncWithUrl) {
      return {
        sorting: defaultSorting,
        columnFilters: defaultColumnFilters,
        pagination: defaultPagination,
        globalFilter: '',
      };
    }
    
    const pageKey = urlKeys.page || 'page';
    const pageSizeKey = urlKeys.pageSize || 'pageSize';
    const sortByKey = urlKeys.sortBy || 'sortBy';
    const sortOrderKey = urlKeys.sortOrder || 'sortOrder';
    const searchKey = urlKeys.search || 'search';
    
    const page = parseInt(searchParams.get(pageKey) || '1', 10) - 1;
    const pageSize = parseInt(searchParams.get(pageSizeKey) || String(defaultPagination.pageSize), 10);
    const sortBy = searchParams.get(sortByKey);
    const sortOrder = searchParams.get(sortOrderKey) || 'desc';
    const search = searchParams.get(searchKey) || '';
    
    return {
      sorting: sortBy ? [{ id: sortBy, desc: sortOrder === 'desc' }] : defaultSorting,
      columnFilters: defaultColumnFilters,
      pagination: { pageIndex: page, pageSize },
      globalFilter: search,
    };
  }, [syncWithUrl, searchParams, urlKeys, defaultSorting, defaultColumnFilters, defaultPagination]);
  
  // State
  const [sorting, setSorting] = useState<SortingState>(initialState.sorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialState.columnFilters);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>(initialState.pagination);
  const [globalFilter, setGlobalFilter] = useState<string>(initialState.globalFilter);
  
  // Sync to URL
  const syncToUrl = useCallback((state: Partial<TableState>) => {
    if (!syncWithUrl) return;
    
    const params = new URLSearchParams(searchParams.toString());
    
    const pageKey = urlKeys.page || 'page';
    const pageSizeKey = urlKeys.pageSize || 'pageSize';
    const sortByKey = urlKeys.sortBy || 'sortBy';
    const sortOrderKey = urlKeys.sortOrder || 'sortOrder';
    const searchKey = urlKeys.search || 'search';
    
    if (state.pagination) {
      params.set(pageKey, String(state.pagination.pageIndex + 1));
      params.set(pageSizeKey, String(state.pagination.pageSize));
    }
    
    if (state.sorting !== undefined) {
      if (state.sorting.length > 0) {
        params.set(sortByKey, state.sorting[0].id);
        params.set(sortOrderKey, state.sorting[0].desc ? 'desc' : 'asc');
      } else {
        params.delete(sortByKey);
        params.delete(sortOrderKey);
      }
    }
    
    if (state.globalFilter !== undefined) {
      if (state.globalFilter) {
        params.set(searchKey, state.globalFilter);
      } else {
        params.delete(searchKey);
      }
    }
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [syncWithUrl, searchParams, urlKeys, router, pathname]);
  
  // Wrapped setters that sync to URL
  const wrappedSetSorting = useCallback((updater: SortingState | ((old: SortingState) => SortingState)) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(newSorting);
    syncToUrl({ sorting: newSorting });
  }, [sorting, syncToUrl]);
  
  const wrappedSetPagination = useCallback((updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
    const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
    setPagination(newPagination);
    syncToUrl({ pagination: newPagination });
  }, [pagination, syncToUrl]);
  
  const wrappedSetGlobalFilter = useCallback((value: string) => {
    setGlobalFilter(value);
    setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to first page
    syncToUrl({ globalFilter: value, pagination: { ...pagination, pageIndex: 0 } });
  }, [pagination, syncToUrl]);
  
  // Reset functions
  const resetState = useCallback(() => {
    setSorting(defaultSorting);
    setColumnFilters(defaultColumnFilters);
    setColumnVisibility(defaultColumnVisibility);
    setRowSelection({});
    setPagination(defaultPagination);
    setGlobalFilter('');
    syncToUrl({
      sorting: defaultSorting,
      pagination: defaultPagination,
      globalFilter: '',
    });
  }, [defaultSorting, defaultColumnFilters, defaultColumnVisibility, defaultPagination, syncToUrl]);
  
  const resetFilters = useCallback(() => {
    setColumnFilters([]);
    setGlobalFilter('');
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    syncToUrl({
      globalFilter: '',
      pagination: { ...pagination, pageIndex: 0 },
    });
  }, [pagination, syncToUrl]);
  
  const resetSelection = useCallback(() => {
    setRowSelection({});
  }, []);
  
  // Return state and actions
  const state: TableState = {
    sorting,
    columnFilters,
    columnVisibility,
    rowSelection,
    pagination,
    globalFilter,
  };
  
  const actions: TableStateActions = {
    setSorting: wrappedSetSorting,
    setColumnFilters,
    setColumnVisibility,
    setRowSelection,
    setPagination: wrappedSetPagination,
    setGlobalFilter: wrappedSetGlobalFilter,
    resetState,
    resetFilters,
    resetSelection,
  };
  
  return [state, actions];
}
```

### 13.2 Table Query Hook

```typescript
// hooks/use-table-query.ts
'use client';

import { useMemo } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { SortingState, ColumnFiltersState, PaginationState } from '@tanstack/react-table';

interface TableQueryParams {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  pagination: PaginationState;
  globalFilter: string;
  additionalParams?: Record<string, string | number | boolean | undefined>;
}

interface UseTableQueryOptions<TData> {
  queryKey: string[];
  endpoint: string;
  params: TableQueryParams;
  queryOptions?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>;
  
  // Mapping pentru URL params
  paramMapping?: {
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
  };
}

export function useTableQuery<TData>({
  queryKey,
  endpoint,
  params,
  queryOptions,
  paramMapping = {},
}: UseTableQueryOptions<TData>) {
  const {
    page = 'page',
    pageSize = 'pageSize',
    sortBy = 'sortBy',
    sortOrder = 'sortOrder',
    search = 'search',
  } = paramMapping;
  
  // Build query string
  const queryString = useMemo(() => {
    const urlParams = new URLSearchParams();
    
    // Pagination
    urlParams.set(page, String(params.pagination.pageIndex + 1));
    urlParams.set(pageSize, String(params.pagination.pageSize));
    
    // Sorting
    if (params.sorting.length > 0) {
      urlParams.set(sortBy, params.sorting[0].id);
      urlParams.set(sortOrder, params.sorting[0].desc ? 'desc' : 'asc');
    }
    
    // Global filter
    if (params.globalFilter) {
      urlParams.set(search, params.globalFilter);
    }
    
    // Column filters
    params.columnFilters.forEach((filter) => {
      if (Array.isArray(filter.value)) {
        urlParams.set(filter.id, filter.value.join(','));
      } else if (filter.value !== undefined && filter.value !== null) {
        urlParams.set(filter.id, String(filter.value));
      }
    });
    
    // Additional params
    if (params.additionalParams) {
      Object.entries(params.additionalParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlParams.set(key, String(value));
        }
      });
    }
    
    return urlParams.toString();
  }, [params, page, pageSize, sortBy, sortOrder, search]);
  
  // Query
  return useQuery<TData>({
    queryKey: [...queryKey, queryString],
    queryFn: async () => {
      const response = await fetch(`${endpoint}?${queryString}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    ...queryOptions,
  });
}
```

### 13.3 Table Persistence Hook

```typescript
// hooks/use-table-persistence.ts
'use client';

import { useCallback, useEffect } from 'react';
import { VisibilityState } from '@tanstack/react-table';

interface UseTablePersistenceOptions {
  storageKey: string;
  storage?: 'localStorage' | 'sessionStorage';
}

interface PersistedState {
  columnVisibility?: VisibilityState;
  pageSize?: number;
}

export function useTablePersistence({
  storageKey,
  storage = 'localStorage',
}: UseTablePersistenceOptions) {
  const getStorage = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return storage === 'localStorage' ? localStorage : sessionStorage;
  }, [storage]);
  
  const loadState = useCallback((): PersistedState | null => {
    try {
      const storageInstance = getStorage();
      if (!storageInstance) return null;
      
      const saved = storageInstance.getItem(storageKey);
      if (!saved) return null;
      
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }, [storageKey, getStorage]);
  
  const saveState = useCallback((state: PersistedState) => {
    try {
      const storageInstance = getStorage();
      if (!storageInstance) return;
      
      storageInstance.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, getStorage]);
  
  const clearState = useCallback(() => {
    try {
      const storageInstance = getStorage();
      if (!storageInstance) return;
      
      storageInstance.removeItem(storageKey);
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, getStorage]);
  
  return {
    loadState,
    saveState,
    clearState,
  };
}
```

---

## 14. Table Integration Examples and Best Practices

### 14.1 Complete Page Integration Example

```typescript
// pages/products/page.tsx
'use client';

import { Suspense } from 'react';
import { ProductsTable } from '@/components/tables/products-table';
import { TableSkeleton } from '@/components/tables/shared/table-skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';

export default function ProductsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Catalog Produse"
        description="Gestionează catalogul de produse și stocuri"
      >
        <div className="flex items-center gap-2">
          {can('products:export') && (
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          {can('products:import') && (
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          )}
          {can('products:create') && (
            <Button size="sm" onClick={() => router.push('/products/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Produs Nou
            </Button>
          )}
        </div>
      </PageHeader>
      
      <Suspense fallback={<TableSkeleton rows={10} columns={8} />}>
        <ProductsTable />
      </Suspense>
    </div>
  );
}
```

### 14.2 Table with Server Actions

```typescript
// components/tables/products-table-with-actions.tsx
'use client';

import { useCallback, useTransition } from 'react';
import { ProductsTable } from './products-table';
import { useToast } from '@/components/ui/use-toast';
import { 
  deleteProduct, 
  updateProductStatus,
  bulkDeleteProducts,
  bulkUpdateProductsStatus 
} from '@/actions/products';

export function ProductsTableWithActions() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const handleDelete = useCallback(async (productId: string) => {
    startTransition(async () => {
      try {
        await deleteProduct(productId);
        toast({
          title: 'Produs șters',
          description: 'Produsul a fost șters cu succes.',
        });
      } catch (error) {
        toast({
          title: 'Eroare',
          description: 'Nu s-a putut șterge produsul.',
          variant: 'destructive',
        });
      }
    });
  }, [toast]);
  
  const handleStatusChange = useCallback(async (
    productId: string, 
    status: 'active' | 'inactive' | 'discontinued'
  ) => {
    startTransition(async () => {
      try {
        await updateProductStatus(productId, status);
        toast({
          title: 'Status actualizat',
          description: `Produsul este acum ${status}.`,
        });
      } catch (error) {
        toast({
          title: 'Eroare',
          description: 'Nu s-a putut actualiza statusul.',
          variant: 'destructive',
        });
      }
    });
  }, [toast]);
  
  const handleBulkDelete = useCallback(async (productIds: string[]) => {
    startTransition(async () => {
      try {
        await bulkDeleteProducts(productIds);
        toast({
          title: 'Produse șterse',
          description: `${productIds.length} produse au fost șterse.`,
        });
      } catch (error) {
        toast({
          title: 'Eroare',
          description: 'Nu s-au putut șterge produsele.',
          variant: 'destructive',
        });
      }
    });
  }, [toast]);
  
  const handleBulkStatusChange = useCallback(async (
    productIds: string[],
    status: 'active' | 'inactive' | 'discontinued'
  ) => {
    startTransition(async () => {
      try {
        await bulkUpdateProductsStatus(productIds, status);
        toast({
          title: 'Statusuri actualizate',
          description: `${productIds.length} produse au fost actualizate.`,
        });
      } catch (error) {
        toast({
          title: 'Eroare',
          description: 'Nu s-au putut actualiza statusurile.',
          variant: 'destructive',
        });
      }
    });
  }, [toast]);
  
  return (
    <ProductsTable
      isLoading={isPending}
      onDelete={handleDelete}
      onStatusChange={handleStatusChange}
      onBulkDelete={handleBulkDelete}
      onBulkStatusChange={handleBulkStatusChange}
    />
  );
}
```

### 14.3 Optimistic Updates Pattern

```typescript
// hooks/use-optimistic-table-mutation.ts
'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseOptimisticTableMutationOptions<TData, TVariables> {
  queryKey: unknown[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  optimisticUpdate: (
    oldData: TData[] | undefined,
    variables: TVariables
  ) => TData[] | undefined;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export function useOptimisticTableMutation<TData, TVariables>({
  queryKey,
  mutationFn,
  optimisticUpdate,
  onSuccess,
  onError,
}: UseOptimisticTableMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData[]>(queryKey);
      
      // Optimistically update
      queryClient.setQueryData<TData[]>(queryKey, (old) => 
        optimisticUpdate(old, variables)
      );
      
      // Return snapshot for rollback
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      onError?.(error as Error, variables);
    },
    onSuccess: (data, variables) => {
      onSuccess?.(data, variables);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Usage example
function useDeleteProduct() {
  return useOptimisticTableMutation<Product, string>({
    queryKey: ['products'],
    mutationFn: async (productId) => {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    optimisticUpdate: (oldData, productId) => {
      return oldData?.filter(product => product.id !== productId);
    },
    onSuccess: () => {
      toast({ title: 'Produs șters cu succes' });
    },
    onError: () => {
      toast({ title: 'Eroare la ștergere', variant: 'destructive' });
    },
  });
}
```

### 14.4 Real-time Updates with WebSocket

```typescript
// hooks/use-realtime-table.ts
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseRealtimeTableOptions<TData> {
  queryKey: unknown[];
  wsEndpoint: string;
  onInsert?: (item: TData) => void;
  onUpdate?: (item: TData) => void;
  onDelete?: (itemId: string) => void;
}

export function useRealtimeTable<TData extends { id: string }>({
  queryKey,
  wsEndpoint,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeTableOptions<TData>) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'INSERT':
          queryClient.setQueryData<TData[]>(queryKey, (old) => {
            if (!old) return [message.data];
            return [message.data, ...old];
          });
          onInsert?.(message.data);
          break;
          
        case 'UPDATE':
          queryClient.setQueryData<TData[]>(queryKey, (old) => {
            if (!old) return old;
            return old.map(item => 
              item.id === message.data.id ? message.data : item
            );
          });
          onUpdate?.(message.data);
          break;
          
        case 'DELETE':
          queryClient.setQueryData<TData[]>(queryKey, (old) => {
            if (!old) return old;
            return old.filter(item => item.id !== message.id);
          });
          onDelete?.(message.id);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [queryClient, queryKey, onInsert, onUpdate, onDelete]);
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    wsRef.current = new WebSocket(wsEndpoint);
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };
    
    wsRef.current.onmessage = handleMessage;
    
    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [wsEndpoint, handleMessage]);
  
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);
  
  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
```

### 14.5 Table Performance Best Practices

```typescript
// components/tables/optimized-table.tsx
'use client';

import { memo, useCallback, useMemo } from 'react';
import { 
  useReactTable, 
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface OptimizedTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  estimatedRowHeight?: number;
  overscan?: number;
}

// Memoized row component for performance
const TableRow = memo(function TableRow<TData>({
  row,
  virtualRow,
  rowVirtualizer,
}: {
  row: any;
  virtualRow: any;
  rowVirtualizer: any;
}) {
  return (
    <tr
      data-index={virtualRow.index}
      ref={(node) => rowVirtualizer.measureElement(node)}
      className="border-b transition-colors hover:bg-muted/50"
      style={{
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      {row.getVisibleCells().map((cell: any) => (
        <td key={cell.id} className="p-2 align-middle">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
});

export function OptimizedTable<TData>({
  data,
  columns,
  estimatedRowHeight = 48,
  overscan = 5,
}: OptimizedTableProps<TData>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Memoize columns to prevent unnecessary re-renders
  const memoizedColumns = useMemo(() => columns, [columns]);
  
  const table = useReactTable({
    data,
    columns: memoizedColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Enable row virtualization for large datasets
    enableRowVirtualization: true,
  });
  
  const { rows } = table.getRowModel();
  
  // Virtualize rows for performance with large datasets
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => estimatedRowHeight,
    getScrollElement: () => tableContainerRef.current,
    overscan,
  });
  
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  
  // Memoize header render for performance
  const headerGroups = useMemo(
    () => table.getHeaderGroups(),
    [table]
  );
  
  return (
    <div
      ref={tableContainerRef}
      className="relative h-[600px] overflow-auto rounded-md border"
    >
      <table className="w-full caption-bottom text-sm">
        <thead className="sticky top-0 z-10 bg-background border-b">
          {headerGroups.map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="h-12 px-2 text-left align-middle font-medium text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody
          style={{
            height: `${totalSize}px`,
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <TableRow
                key={row.id}
                row={row}
                virtualRow={virtualRow}
                rowVirtualizer={rowVirtualizer}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

### 14.6 Table Accessibility Patterns

```typescript
// components/tables/accessible-table.tsx
'use client';

import { useId, useCallback } from 'react';
import { 
  useReactTable, 
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';

interface AccessibleTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  caption: string;
  ariaLabel?: string;
  onRowSelect?: (row: TData) => void;
}

export function AccessibleTable<TData>({
  data,
  columns,
  caption,
  ariaLabel,
  onRowSelect,
}: AccessibleTableProps<TData>) {
  const tableId = useId();
  const captionId = `${tableId}-caption`;
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, row: TData) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onRowSelect?.(row);
      }
    },
    [onRowSelect]
  );
  
  return (
    <div 
      role="region" 
      aria-label={ariaLabel || caption}
      className="overflow-x-auto"
    >
      <table
        id={tableId}
        aria-describedby={captionId}
        className="w-full caption-bottom text-sm"
      >
        <caption id={captionId} className="sr-only">
          {caption}
        </caption>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                  aria-sort={
                    header.column.getIsSorted()
                      ? header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={onRowSelect ? 0 : undefined}
              role={onRowSelect ? 'button' : undefined}
              aria-selected={row.getIsSelected()}
              onClick={() => onRowSelect?.(row.original)}
              onKeyDown={(e) => handleKeyDown(e, row.original)}
              className={cn(
                'border-b transition-colors',
                onRowSelect && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                row.getIsSelected() && 'bg-muted'
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="p-4 align-middle"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`Tabel cu ${data.length} rânduri. ${
          table.getFilteredSelectedRowModel().rows.length
        } selectate.`}
      </div>
    </div>
  );
}
```

### 14.7 Table Testing Patterns

```typescript
// __tests__/components/tables/products-table.test.tsx
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductsTable } from '@/components/tables/products-table';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock data
const mockProducts = [
  {
    id: '1',
    name: 'Semințe Porumb Pioneer P9911',
    sku: 'SKU-001',
    category: 'Semințe',
    price: 450.00,
    stock: 150,
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
  {
    id: '2',
    name: 'Îngrășământ NPK 15-15-15',
    sku: 'SKU-002',
    category: 'Îngrășăminte',
    price: 280.00,
    stock: 500,
    status: 'active',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-18T11:00:00Z',
  },
];

// MSW handlers
const handlers = [
  http.get('/api/products', () => {
    return HttpResponse.json({
      data: mockProducts,
      total: mockProducts.length,
      page: 1,
      pageSize: 10,
    });
  }),
  http.delete('/api/products/:id', ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ProductsTable', () => {
  it('renders loading state initially', () => {
    render(<ProductsTable />, { wrapper: createWrapper() });
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
  });
  
  it('renders products after loading', async () => {
    render(<ProductsTable />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Semințe Porumb Pioneer P9911')).toBeInTheDocument();
      expect(screen.getByText('Îngrășământ NPK 15-15-15')).toBeInTheDocument();
    });
  });
  
  it('allows sorting by column', async () => {
    const user = userEvent.setup();
    render(<ProductsTable />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Semințe Porumb Pioneer P9911')).toBeInTheDocument();
    });
    
    // Click on price header to sort
    const priceHeader = screen.getByRole('columnheader', { name: /preț/i });
    await user.click(priceHeader);
    
    // Verify sorting indicator appears
    expect(priceHeader).toHaveAttribute('aria-sort', 'ascending');
  });
  
  it('allows filtering by search', async () => {
    const user = userEvent.setup();
    render(<ProductsTable />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Semințe Porumb Pioneer P9911')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/caută/i);
    await user.type(searchInput, 'Porumb');
    
    // Wait for debounce
    await waitFor(() => {
      expect(screen.getByText('Semințe Porumb Pioneer P9911')).toBeInTheDocument();
      expect(screen.queryByText('Îngrășământ NPK 15-15-15')).not.toBeInTheDocument();
    });
  });
  
  it('allows row selection', async () => {
    const user = userEvent.setup();
    render(<ProductsTable />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Semințe Porumb Pioneer P9911')).toBeInTheDocument();
    });
    
    // Select first row
    const firstCheckbox = screen.getAllByRole('checkbox')[1]; // Skip header checkbox
    await user.click(firstCheckbox);
    
    expect(firstCheckbox).toBeChecked();
    
    // Verify bulk actions appear
    expect(screen.getByText(/1 selectat/i)).toBeInTheDocument();
  });
  
  it('allows bulk selection', async () => {
    const user = userEvent.setup();
    render(<ProductsTable />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Semințe Porumb Pioneer P9911')).toBeInTheDocument();
    });
    
    // Select all via header checkbox
    const headerCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(headerCheckbox);
    
    // All checkboxes should be checked
    const allCheckboxes = screen.getAllByRole('checkbox');
    allCheckboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked();
    });
  });
  
  it('handles delete action', async () => {
    const user = userEvent.setup();
    render(<ProductsTable />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Semințe Porumb Pioneer P9911')).toBeInTheDocument();
    });
    
    // Open row actions menu
    const actionsButton = screen.getAllByRole('button', { name: /acțiuni/i })[0];
    await user.click(actionsButton);
    
    // Click delete
    const deleteButton = screen.getByRole('menuitem', { name: /șterge/i });
    await user.click(deleteButton);
    
    // Confirm in dialog
    const confirmButton = screen.getByRole('button', { name: /confirmă/i });
    await user.click(confirmButton);
    
    // Verify success toast
    await waitFor(() => {
      expect(screen.getByText(/șters cu succes/i)).toBeInTheDocument();
    });
  });
  
  it('handles pagination', async () => {
    const user = userEvent.setup();
    
    // Mock paginated response
    server.use(
      http.get('/api/products', ({ request }) => {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        
        return HttpResponse.json({
          data: page === 1 ? mockProducts : [],
          total: 25,
          page,
          pageSize: 10,
        });
      })
    );
    
    render(<ProductsTable />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Semințe Porumb Pioneer P9911')).toBeInTheDocument();
    });
    
    // Go to next page
    const nextButton = screen.getByRole('button', { name: /următoarea/i });
    await user.click(nextButton);
    
    // Verify page changed
    await waitFor(() => {
      expect(screen.getByText(/pagina 2/i)).toBeInTheDocument();
    });
  });
  
  it('handles error state', async () => {
    // Mock error response
    server.use(
      http.get('/api/products', () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );
    
    render(<ProductsTable />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText(/eroare/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reîncearcă/i })).toBeInTheDocument();
    });
  });
  
  it('handles empty state', async () => {
    // Mock empty response
    server.use(
      http.get('/api/products', () => {
        return HttpResponse.json({
          data: [],
          total: 0,
          page: 1,
          pageSize: 10,
        });
      })
    );
    
    render(<ProductsTable />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText(/nu există produse/i)).toBeInTheDocument();
    });
  });
});
```

### 14.8 E2E Testing with Playwright

```typescript
// e2e/products-table.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Products Table', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Navigate to products
    await page.waitForURL('/dashboard');
    await page.click('a[href="/products"]');
    await page.waitForURL('/products');
  });
  
  test('displays products table with data', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('table')).toBeVisible();
    
    // Verify columns exist
    await expect(page.locator('th', { hasText: 'Nume' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'SKU' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Preț' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Stoc' })).toBeVisible();
    
    // Verify data rows exist
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(10); // Default page size
  });
  
  test('search filters results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/caută/i);
    
    // Search for specific product
    await searchInput.fill('Porumb');
    
    // Wait for debounce and API call
    await page.waitForResponse(resp => 
      resp.url().includes('/api/products') && 
      resp.url().includes('search=Porumb')
    );
    
    // Verify filtered results
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('td', { hasText: 'Porumb' })).toBeVisible();
  });
  
  test('sorting changes order', async ({ page }) => {
    // Click price header to sort
    await page.click('th:has-text("Preț")');
    
    // Verify sorting indicator
    await expect(page.locator('th:has-text("Preț")')).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    
    // Click again for descending
    await page.click('th:has-text("Preț")');
    await expect(page.locator('th:has-text("Preț")')).toHaveAttribute(
      'aria-sort',
      'descending'
    );
  });
  
  test('pagination works correctly', async ({ page }) => {
    // Verify initial page
    await expect(page.locator('text=Pagina 1')).toBeVisible();
    
    // Go to next page
    await page.click('button[aria-label="Pagina următoare"]');
    
    // Verify page changed
    await expect(page.locator('text=Pagina 2')).toBeVisible();
    
    // Go back
    await page.click('button[aria-label="Pagina anterioară"]');
    await expect(page.locator('text=Pagina 1')).toBeVisible();
  });
  
  test('row selection and bulk actions', async ({ page }) => {
    // Select first row
    await page.click('tbody tr:first-child input[type="checkbox"]');
    
    // Verify selection indicator
    await expect(page.locator('text=1 selectat')).toBeVisible();
    
    // Select all
    await page.click('thead input[type="checkbox"]');
    
    // Verify all selected
    await expect(page.locator('text=10 selectate')).toBeVisible();
    
    // Verify bulk actions visible
    await expect(page.getByRole('button', { name: /șterge selectate/i })).toBeVisible();
  });
  
  test('delete product with confirmation', async ({ page }) => {
    // Open actions menu for first row
    await page.click('tbody tr:first-child button[aria-haspopup="menu"]');
    
    // Click delete
    await page.click('role=menuitem >> text=Șterge');
    
    // Verify confirmation dialog
    await expect(page.locator('role=alertdialog')).toBeVisible();
    await expect(page.locator('text=Ești sigur')).toBeVisible();
    
    // Cancel
    await page.click('button:has-text("Anulează")');
    await expect(page.locator('role=alertdialog')).not.toBeVisible();
    
    // Try again and confirm
    await page.click('tbody tr:first-child button[aria-haspopup="menu"]');
    await page.click('role=menuitem >> text=Șterge');
    await page.click('button:has-text("Confirmă")');
    
    // Verify success toast
    await expect(page.locator('text=șters cu succes')).toBeVisible();
  });
  
  test('export functionality', async ({ page }) => {
    // Click export button
    await page.click('button:has-text("Export")');
    
    // Verify export options
    await expect(page.locator('text=CSV')).toBeVisible();
    await expect(page.locator('text=Excel')).toBeVisible();
    await expect(page.locator('text=PDF')).toBeVisible();
    
    // Start download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=CSV'),
    ]);
    
    // Verify download
    expect(download.suggestedFilename()).toContain('products');
    expect(download.suggestedFilename()).toContain('.csv');
  });
  
  test('column visibility toggle', async ({ page }) => {
    // Open column toggle
    await page.click('button[aria-label="Coloane vizibile"]');
    
    // Hide SKU column
    await page.click('text=SKU');
    
    // Verify column hidden
    await expect(page.locator('th:has-text("SKU")')).not.toBeVisible();
    
    // Show again
    await page.click('button[aria-label="Coloane vizibile"]');
    await page.click('text=SKU');
    await expect(page.locator('th:has-text("SKU")')).toBeVisible();
  });
  
  test('keyboard navigation', async ({ page }) => {
    // Focus table
    await page.click('table');
    
    // Navigate with keyboard
    await page.keyboard.press('Tab'); // To first row
    await page.keyboard.press('ArrowDown'); // To second row
    await page.keyboard.press('Enter'); // Select/activate row
    
    // Verify row is focused
    const secondRow = page.locator('tbody tr:nth-child(2)');
    await expect(secondRow).toBeFocused();
  });
  
  test('responsive behavior', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify table scrolls horizontally
    const tableContainer = page.locator('.overflow-x-auto');
    await expect(tableContainer).toBeVisible();
    
    // Verify key columns still visible
    await expect(page.locator('th:has-text("Nume")')).toBeVisible();
    await expect(page.locator('th:has-text("Preț")')).toBeVisible();
  });
});
```

---

## 15. Summary și Concluzii

### 15.1 Arhitectura Tabelelor

Documentația acoperă implementarea completă a sistemului de tabele pentru modulul AI Sales Agent:

1. **Base Components**: DataTable generic cu TanStack Table v8, toolbar, paginare, filtre faceted
2. **Domain Tables**: 10 tabele specifice domeniului (Products, Conversations, Negotiations, Offers, Orders, Fiscal Documents, HITL Approvals, AI Sessions, Audit Logs, Performance Metrics)
3. **Shared Components**: 7 componente reutilizabile (EmptyState, TableSkeleton, ErrorState, BulkActionsToolbar, RowActionsMenu, ColumnToggle, ExportButton)
4. **State Management**: 3 hooks customizate (useTableState, useTableQuery, useTablePersistence)

### 15.2 Principii de Design

- **Type Safety**: TypeScript complet cu generics pentru toate componentele
- **Server-Side Processing**: Paginare, sortare, filtrare pe server pentru performanță
- **Real-Time Updates**: WebSocket și auto-refresh pentru date live
- **Optimistic Updates**: Feedback instant cu rollback pe eroare
- **Virtualization**: Row virtualization pentru dataset-uri mari
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

### 15.3 Integrare cu Backend

- **TanStack Query**: Cache management, refetch strategies, optimistic updates
- **URL Sync**: Sincronizare state cu URL pentru bookmarking și sharing
- **Persistence**: localStorage/sessionStorage pentru preferințe utilizator
- **Error Handling**: Retry logic, error boundaries, graceful degradation

### 15.4 Testing Coverage

- **Unit Tests**: Jest + React Testing Library pentru componente izolate
- **Integration Tests**: MSW pentru mock API calls
- **E2E Tests**: Playwright pentru fluxuri complete
- **Accessibility Tests**: aXe pentru conformitate WCAG

### 15.5 Metrici de Performanță

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Load | < 500ms | Time to First Contentful Paint |
| Table Render | < 100ms | Time to render 100 rows |
| Sort/Filter | < 50ms | Time to re-render after action |
| Virtual Scroll | 60fps | Frame rate during scroll |
| Memory Usage | < 50MB | With 10,000 rows loaded |

---

**Document complet: 14 secțiuni majore, ~13,000+ linii de cod și documentație.**

**Actualizat**: Ianuarie 2026  
**Versiune**: 1.0.0  
**Autor**: Echipa Cerniq
