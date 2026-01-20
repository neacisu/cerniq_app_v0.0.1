# CERNIQ.APP — ETAPA 1: UI TABLES & DATA GRIDS
## Tabele cu Paginare, Sortare, Filtrare
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. DATA TABLE COMPONENT

## 1.1 Base DataTable

```tsx
// src/components/data-table/data-table.tsx

import { useState, useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton, TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  
  // Pagination
  pagination?: {
    current: number;
    total: number;
    pageSize: number;
    pageSizeOptions?: number[];
    onChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  
  // Sorting (server-side)
  sorting?: {
    sorters: { field: string; order: 'asc' | 'desc' }[];
    setSorters: (sorters: { field: string; order: 'asc' | 'desc' }[]) => void;
  };
  
  // Row Selection
  rowSelection?: {
    enabled: boolean;
    selected?: Record<string, boolean>;
    onSelectionChange: (selection: Record<string, boolean>) => void;
  };
  
  // Search
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  
  // Empty state
  emptyState?: {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
  };
  
  // Row click
  onRowClick?: (row: TData) => void;
  
  // Custom toolbar
  toolbarActions?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  pagination,
  sorting,
  rowSelection,
  searchable,
  searchPlaceholder,
  onSearch,
  emptyState,
  onRowClick,
  toolbarActions,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  
  // Controlled sorting
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: sorting?.sorters.map(s => ({ id: s.field, desc: s.order === 'desc' })) || internalSorting,
      columnFilters,
      columnVisibility,
      rowSelection: rowSelection?.selected || internalRowSelection,
    },
    enableRowSelection: rowSelection?.enabled,
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(internalSorting) : updater;
      setInternalSorting(newSorting);
      
      if (sorting?.setSorters) {
        sorting.setSorters(newSorting.map(s => ({
          field: s.id,
          order: s.desc ? 'desc' : 'asc',
        })));
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(internalRowSelection) : updater;
      setInternalRowSelection(newSelection);
      rowSelection?.onSelectionChange(newSelection);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: !!pagination,
    manualSorting: !!sorting,
  });
  
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(searchable || toolbarActions) && (
        <DataTableToolbar
          table={table}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
        >
          {toolbarActions}
        </DataTableToolbar>
      )}
      
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.getCanSort() && 'cursor-pointer select-none hover:bg-gray-50'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span className="text-primary-500">
                          {header.column.getIsSorted() === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 10 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={columns.length} />
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    onRowClick && 'cursor-pointer hover:bg-gray-50'
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <EmptyState
                    title={emptyState?.title || 'No results'}
                    description={emptyState?.description || 'No data to display'}
                    icon={emptyState?.icon}
                    action={emptyState?.action}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {pagination && (
        <DataTablePagination
          current={pagination.current}
          total={pagination.total}
          pageSize={pagination.pageSize}
          pageSizeOptions={pagination.pageSizeOptions}
          onChange={pagination.onChange}
          onPageSizeChange={pagination.onPageSizeChange}
          selectedCount={Object.keys(rowSelection?.selected || {}).length}
        />
      )}
    </div>
  );
}
```

## 1.2 DataTable Pagination

```tsx
// src/components/data-table/data-table-pagination.tsx

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react';

interface DataTablePaginationProps {
  current: number;
  total: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  selectedCount?: number;
}

export function DataTablePagination({
  current,
  total,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onChange,
  onPageSizeChange,
  selectedCount,
}: DataTablePaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (current - 1) * pageSize + 1;
  const endItem = Math.min(current * pageSize, total);
  
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-4 text-sm text-gray-600">
        {selectedCount !== undefined && selectedCount > 0 && (
          <span className="font-medium text-primary-600">
            {selectedCount} selected
          </span>
        )}
        <span>
          Showing {startItem} to {endItem} of {total.toLocaleString()} results
        </span>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onChange(1)}
            disabled={current === 1}
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onChange(current - 1)}
            disabled={current === 1}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          
          {/* Page Numbers */}
          <div className="flex items-center gap-1 mx-2">
            {generatePageNumbers(current, totalPages).map((page, i) => (
              page === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
              ) : (
                <Button
                  key={page}
                  variant={page === current ? 'default' : 'outline'}
                  size="icon-sm"
                  onClick={() => onChange(page as number)}
                >
                  {page}
                </Button>
              )
            ))}
          </div>
          
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onChange(current + 1)}
            disabled={current === totalPages}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onChange(totalPages)}
            disabled={current === totalPages}
          >
            <ChevronsRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  
  if (current <= 3) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  
  if (current >= total - 2) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  
  return [1, '...', current - 1, current, current + 1, '...', total];
}
```

## 1.3 DataTable Toolbar

```tsx
// src/components/data-table/data-table-toolbar.tsx

import { Table } from '@tanstack/react-table';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SlidersHorizontalIcon } from 'lucide-react';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  children?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  searchable,
  searchPlaceholder = 'Search...',
  onSearch,
  children,
}: DataTableToolbarProps<TData>) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {searchable && (
          <SearchInput
            placeholder={searchPlaceholder}
            className="w-64"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {children}
        
        {/* Column visibility toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontalIcon className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
```

---

# 2. SPECIALIZED TABLES

## 2.1 Bronze Contacts Table Columns

```tsx
// src/pages/bronze/contacts/columns.tsx

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate } from '@/lib/utils';

export interface BronzeContact {
  id: string;
  extractedName: string | null;
  extractedCui: string | null;
  extractedEmail: string | null;
  extractedPhone: string | null;
  sourceType: string;
  processingStatus: string;
  createdAt: string;
}

export const bronzeContactsColumns: ColumnDef<BronzeContact>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'extractedName',
    header: 'Name',
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.extractedName || (
          <span className="text-gray-400 italic">Not extracted</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'extractedCui',
    header: 'CUI',
    cell: ({ row }) => (
      <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">
        {row.original.extractedCui || '—'}
      </code>
    ),
  },
  {
    accessorKey: 'extractedEmail',
    header: 'Email',
    cell: ({ row }) => row.original.extractedEmail || '—',
  },
  {
    accessorKey: 'extractedPhone',
    header: 'Phone',
    cell: ({ row }) => row.original.extractedPhone || '—',
  },
  {
    accessorKey: 'sourceType',
    header: 'Source',
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.sourceType}</Badge>
    ),
  },
  {
    accessorKey: 'processingStatus',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.processingStatus;
      const variant = status === 'promoted' ? 'success' :
                      status === 'rejected' ? 'destructive' :
                      status === 'processing' ? 'processing' : 'pending';
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Imported',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];
```

## 2.2 Silver Companies Table Columns

```tsx
// src/pages/silver/companies/columns.tsx

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { QualityScoreBadge } from '@/components/data/quality-score-badge';
import { EnrichmentStatusBadge } from '@/components/data/enrichment-status-badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontalIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SilverCompany {
  id: string;
  denumire: string;
  cui: string;
  localitate: string;
  judet: string;
  statusFirma: string;
  cuiValidated: boolean;
  enrichmentStatus: string;
  totalQualityScore: number;
  promotionStatus: string;
  updatedAt: string;
}

export const silverCompaniesColumns: ColumnDef<SilverCompany>[] = [
  {
    accessorKey: 'denumire',
    header: 'Company',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.denumire}</div>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <code className="bg-gray-100 px-1 rounded text-xs">{row.original.cui}</code>
          {row.original.cuiValidated && (
            <Badge variant="success" className="text-xs">Validated</Badge>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'localitate',
    header: 'Location',
    cell: ({ row }) => (
      <div>
        <div>{row.original.localitate}</div>
        <div className="text-sm text-gray-500">{row.original.judet}</div>
      </div>
    ),
  },
  {
    accessorKey: 'statusFirma',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.statusFirma;
      return (
        <Badge variant={status === 'ACTIVA' ? 'success' : 'destructive'}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'enrichmentStatus',
    header: 'Enrichment',
    cell: ({ row }) => (
      <EnrichmentStatusBadge status={row.original.enrichmentStatus as any} />
    ),
  },
  {
    accessorKey: 'totalQualityScore',
    header: 'Quality',
    cell: ({ row }) => (
      <QualityScoreBadge score={row.original.totalQualityScore} />
    ),
  },
  {
    accessorKey: 'promotionStatus',
    header: 'Promotion',
    cell: ({ row }) => {
      const status = row.original.promotionStatus;
      const variant = status === 'promoted' ? 'gold' :
                      status === 'eligible' ? 'success' :
                      status === 'blocked' ? 'destructive' : 'secondary';
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>View Details</DropdownMenuItem>
          <DropdownMenuItem>Re-enrich</DropdownMenuItem>
          <DropdownMenuItem>Promote to Gold</DropdownMenuItem>
          <DropdownMenuItem>View Enrichment Log</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
```

## 2.3 Gold Companies Table Columns

```tsx
// src/pages/gold/companies/columns.tsx

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

export interface GoldCompany {
  id: string;
  denumire: string;
  cui: string;
  localitate: string;
  judet: string;
  codCaenPrincipal: string;
  isAgricultural: boolean;
  categorieDimensiune: string;
  leadScore: number;
  currentState: string;
  assignedTo: { id: string; name: string } | null;
  dataUltimaInteractiune: string | null;
}

export const goldCompaniesColumns: ColumnDef<GoldCompany>[] = [
  {
    accessorKey: 'denumire',
    header: 'Company',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 bg-gold-100 text-gold-700">
          <AvatarFallback>
            {row.original.denumire.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{row.original.denumire}</div>
          <div className="text-sm text-gray-500">
            {row.original.localitate}, {row.original.judet}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'categorieDimensiune',
    header: 'Size',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.isAgricultural && (
          <Badge variant="outline" className="text-xs">🌾 Agri</Badge>
        )}
        <Badge variant="secondary">{row.original.categorieDimensiune}</Badge>
      </div>
    ),
  },
  {
    accessorKey: 'leadScore',
    header: 'Lead Score',
    cell: ({ row }) => (
      <div className="w-32">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{row.original.leadScore}</span>
        </div>
        <Progress 
          value={row.original.leadScore} 
          className="h-2"
          indicatorClassName={
            row.original.leadScore >= 70 ? 'bg-success-500' :
            row.original.leadScore >= 40 ? 'bg-warning-500' : 'bg-danger-500'
          }
        />
      </div>
    ),
  },
  {
    accessorKey: 'currentState',
    header: 'Stage',
    cell: ({ row }) => {
      const state = row.original.currentState;
      const variant = 
        state === 'CONVERTED' ? 'success' :
        state === 'CHURNED' || state === 'DEAD' ? 'destructive' :
        state.includes('CONTACT') ? 'processing' :
        state === 'NEGOTIATION' || state === 'PROPOSAL' ? 'warning' :
        'secondary';
      return <Badge variant={variant}>{state.replace(/_/g, ' ')}</Badge>;
    },
  },
  {
    accessorKey: 'assignedTo',
    header: 'Owner',
    cell: ({ row }) => {
      const owner = row.original.assignedTo;
      if (!owner) return <span className="text-gray-400">Unassigned</span>;
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {owner.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{owner.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'dataUltimaInteractiune',
    header: 'Last Activity',
    cell: ({ row }) => {
      const date = row.original.dataUltimaInteractiune;
      if (!date) return <span className="text-gray-400">Never</span>;
      return formatRelative(date);
    },
  },
];
```

---

# 3. BULK ACTIONS BAR

```tsx
// src/components/data-table/bulk-action-bar.tsx

import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';

interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface BulkActionBarProps {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionBar({ count, actions, onClear }: BulkActionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-lg shadow-xl">
        <span className="text-sm font-medium">
          {count} item{count !== 1 ? 's' : ''} selected
        </span>
        
        <div className="w-px h-6 bg-gray-700" />
        
        <div className="flex items-center gap-2">
          {actions.map((action, i) => (
            <Button
              key={i}
              size="sm"
              variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
        
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-gray-400 hover:text-white"
          onClick={onClear}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

# 4. FILTER COMPONENTS

## 4.1 Multi-Select Filter

```tsx
// src/components/filters/multi-select-filter.tsx

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDownIcon, XIcon } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  count?: number;
}

interface MultiSelectFilterProps {
  title: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export function MultiSelectFilter({ title, options, selected, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  
  const handleToggle = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    onChange(newSelected);
  };
  
  const handleClear = () => {
    onChange([]);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          {title}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-2 rounded-full">
              {selected.length}
            </Badge>
          )}
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
              />
              <span className="flex-1 text-sm">{option.label}</span>
              {option.count !== undefined && (
                <span className="text-xs text-gray-400">{option.count}</span>
              )}
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={handleClear}
            >
              <XIcon className="h-4 w-4 mr-2" />
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

## 4.2 Date Range Filter

```tsx
// src/components/filters/date-range-filter.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface DateRangeFilterProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  presets?: { label: string; range: DateRange }[];
}

export function DateRangeFilter({ value, onChange, presets }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  
  const defaultPresets = [
    { label: 'Today', range: { from: new Date(), to: new Date() } },
    { label: 'Last 7 days', range: { from: subDays(new Date(), 7), to: new Date() } },
    { label: 'Last 30 days', range: { from: subDays(new Date(), 30), to: new Date() } },
    { label: 'This month', range: { from: startOfMonth(new Date()), to: new Date() } },
  ];
  
  const displayPresets = presets || defaultPresets;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 min-w-[200px] justify-start">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, 'LLL dd')} - {format(value.to, 'LLL dd')}
              </>
            ) : (
              format(value.from, 'LLL dd')
            )
          ) : (
            'Date range'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r p-2 space-y-1">
            {displayPresets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  onChange(preset.range);
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Refine v5, TanStack Table v8
