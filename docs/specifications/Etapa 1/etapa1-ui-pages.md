# CERNIQ.APP — ETAPA 1: FRONTEND UI/UX PAGES
## Arhitectură Pagini și Routing
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. ARHITECTURĂ ROUTING

```
/app                                    ← Layout Principal
├── /dashboard                          ← Dashboard Etapa 1
├── /imports                            ← Import Management
│   ├── /imports                        ← Lista import-uri
│   ├── /imports/new                    ← Upload nou
│   ├── /imports/:id                    ← Detalii import
│   └── /imports/:id/mapping            ← Column mapping
├── /bronze                             ← Bronze Layer
│   ├── /bronze/contacts                ← Lista contacte bronze
│   └── /bronze/contacts/:id            ← Detalii contact bronze
├── /silver                             ← Silver Layer
│   ├── /silver/companies               ← Lista companii silver
│   ├── /silver/companies/:id           ← Detalii companie silver
│   ├── /silver/contacts                ← Lista contacte silver
│   └── /silver/dedup                   ← Dedup candidates
├── /gold                               ← Gold Layer
│   ├── /gold/companies                 ← Lista companii gold
│   ├── /gold/companies/:id             ← Detalii companie gold
│   └── /gold/contacts                  ← Lista contacte gold
├── /enrichment                         ← Enrichment Status
│   ├── /enrichment/queue               ← Queue status
│   └── /enrichment/logs                ← Enrichment logs
├── /approvals                          ← HITL Approvals
│   ├── /approvals                      ← Approval inbox
│   └── /approvals/:id                  ← Review approval
└── /settings                           ← Settings
    ├── /settings/mappings              ← Column mappings
    └── /settings/integrations          ← API integrations
```

---

# 2. PAGINI PRINCIPALE

## 2.1 Dashboard Etapa 1

**Route:** `/dashboard`
**File:** `src/pages/dashboard/index.tsx`

```tsx
// src/pages/dashboard/index.tsx

import { useList, useCustom } from '@refinedev/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PipelineFunnel, 
  QualityGauge, 
  EnrichmentProgress,
  RecentActivity,
  ApprovalsPending 
} from '@/components/dashboard';

export function DashboardPage() {
  // Fetch dashboard stats
  const { data: stats } = useCustom({
    url: '/api/v1/dashboard/stats',
    method: 'get',
  });
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Data Enrichment Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Pipeline Bronze → Silver → Gold
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/imports/new')}>
            <UploadIcon className="w-4 h-4 mr-2" />
            Import New
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Bronze Contacts"
          value={stats?.bronze?.total || 0}
          change={stats?.bronze?.today || 0}
          changeLabel="today"
          icon={<DatabaseIcon />}
          color="orange"
        />
        <KPICard
          title="Silver Companies"
          value={stats?.silver?.total || 0}
          change={stats?.silver?.enriched || 0}
          changeLabel="enriched"
          icon={<BuildingIcon />}
          color="gray"
        />
        <KPICard
          title="Gold Ready"
          value={stats?.gold?.total || 0}
          change={stats?.gold?.promoted || 0}
          changeLabel="this week"
          icon={<StarIcon />}
          color="yellow"
        />
        <KPICard
          title="Pending Approvals"
          value={stats?.approvals?.pending || 0}
          change={stats?.approvals?.urgent || 0}
          changeLabel="urgent"
          icon={<ClipboardCheckIcon />}
          color="red"
          href="/approvals"
        />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineFunnel
              bronze={stats?.bronze?.total}
              silver={stats?.silver?.total}
              gold={stats?.gold?.total}
            />
          </CardContent>
        </Card>
        
        {/* Quality Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Quality Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <QualityGauge
              average={stats?.quality?.average}
              distribution={stats?.quality?.distribution}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Enrichment Progress & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Enrichment Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <EnrichmentProgress
              queues={stats?.enrichment?.queues}
              completionRate={stats?.enrichment?.completionRate}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity limit={10} />
          </CardContent>
        </Card>
      </div>
      
      {/* Pending Approvals Preview */}
      {stats?.approvals?.pending > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 text-orange-500" />
              Pending Approvals ({stats.approvals.pending})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalsPending limit={5} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 2.2 Import Management

**Route:** `/imports`
**File:** `src/pages/imports/list.tsx`

```tsx
// src/pages/imports/list.tsx

import { useTable } from '@refinedev/core';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatBytes } from '@/lib/utils';

export function ImportsListPage() {
  const {
    tableQuery,
    current,
    setCurrent,
    pageSize,
    setPageSize,
    sorters,
    setSorters,
    filters,
    setFilters,
  } = useTable({
    resource: 'imports',
    pagination: { pageSize: 20 },
    sorters: { initial: [{ field: 'createdAt', order: 'desc' }] },
  });
  
  const { data, isLoading } = tableQuery;
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Import History</h1>
        <Button onClick={() => navigate('/imports/new')}>
          <PlusIcon className="w-4 h-4 mr-2" />
          New Import
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={filters.find(f => f.field === 'status')?.value || 'all'}
          onValueChange={(value) => setFilters([
            ...filters.filter(f => f.field !== 'status'),
            ...(value !== 'all' ? [{ field: 'status', operator: 'eq', value }] : []),
          ])}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={filters.find(f => f.field === 'sourceType')?.value || 'all'}
          onValueChange={(value) => setFilters([
            ...filters.filter(f => f.field !== 'sourceType'),
            ...(value !== 'all' ? [{ field: 'sourceType', operator: 'eq', value }] : []),
          ])}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="csv_import">CSV</SelectItem>
            <SelectItem value="excel_import">Excel</SelectItem>
            <SelectItem value="api">API</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                sortable 
                sorted={sorters.find(s => s.field === 'createdAt')?.order}
                onSort={() => handleSort('createdAt')}
              >
                Date
              </TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="text-right">Rows</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Success Rate</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Spinner />
                </TableCell>
              </TableRow>
            ) : data?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No imports found
                </TableCell>
              </TableRow>
            ) : (
              data?.data?.map((batch) => (
                <TableRow key={batch.id} className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/imports/${batch.id}`)}>
                  <TableCell>{formatDate(batch.createdAt)}</TableCell>
                  <TableCell className="font-medium">{batch.filename}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{batch.sourceType}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-gray-500">
                    {formatBytes(batch.fileSizeBytes)}
                  </TableCell>
                  <TableCell className="text-right">{batch.totalRows}</TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={batch.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <SuccessRate 
                      success={batch.successRows} 
                      total={batch.totalRows} 
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <Pagination
        current={current}
        total={data?.total || 0}
        pageSize={pageSize}
        onChange={setCurrent}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
```

---

## 2.3 Upload Page

**Route:** `/imports/new`
**File:** `src/pages/imports/new.tsx`

```tsx
// src/pages/imports/new.tsx

import { useState, useCallback } from 'react';
import { useCreate } from '@refinedev/core';
import { useDropzone } from 'react-dropzone';

export function ImportNewPage() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'confirm'>('upload');
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
  const { mutate: createImport, isLoading } = useCreate();
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setFile(file);
    
    // Parse preview
    parseFilePreview(file).then(rows => {
      setPreview(rows.slice(0, 5));
      setStep('mapping');
    });
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });
  
  const handleImport = () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    
    createImport({
      resource: 'imports',
      values: formData,
    }, {
      onSuccess: (data) => {
        navigate(`/imports/${data.data.id}`);
      },
    });
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Steps indicator */}
      <Steps current={step} steps={['Upload', 'Map Columns', 'Confirm']} />
      
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Upload a CSV or Excel file with contact data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-colors
                ${isDragActive 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input {...getInputProps()} />
              <UploadCloudIcon className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-4 text-lg">
                {isDragActive
                  ? 'Drop the file here'
                  : 'Drag & drop a file, or click to select'
                }
              </p>
              <p className="mt-2 text-sm text-gray-500">
                CSV, XLS, XLSX up to 50MB
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 2: Column Mapping */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Match your file columns to Cerniq fields
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    {Object.keys(preview[0] || {}).map((col) => (
                      <TableHead key={col} className="min-w-[150px]">
                        <div className="space-y-2">
                          <span className="text-xs text-gray-500">{col}</span>
                          <Select
                            value={mapping[col] || ''}
                            onValueChange={(value) => 
                              setMapping({ ...mapping, [col]: value })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Skip</SelectItem>
                              <SelectItem value="denumire">Company Name</SelectItem>
                              <SelectItem value="cui">CUI</SelectItem>
                              <SelectItem value="adresa">Address</SelectItem>
                              <SelectItem value="judet">County</SelectItem>
                              <SelectItem value="localitate">City</SelectItem>
                              <SelectItem value="telefon">Phone</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="contact_name">Contact Name</SelectItem>
                              <SelectItem value="functie">Position</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j} className="text-sm">
                          {String(val).slice(0, 50)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={() => setStep('confirm')}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">File:</span>
                <span className="font-medium">{file?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Size:</span>
                <span>{formatBytes(file?.size || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mapped columns:</span>
                <span>{Object.values(mapping).filter(Boolean).length}</span>
              </div>
            </div>
            
            <Alert>
              <InfoIcon className="w-4 h-4" />
              <AlertDescription>
                Import will run in background. You can track progress on the import details page.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? <Spinner className="mr-2" /> : null}
                Start Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 2.4 Silver Companies List

**Route:** `/silver/companies`
**File:** `src/pages/silver/companies/list.tsx`

```tsx
// src/pages/silver/companies/list.tsx

import { useTable } from '@refinedev/core';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<SilverCompany>[] = [
  {
    accessorKey: 'denumire',
    header: 'Company Name',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.denumire}</div>
        <div className="text-sm text-gray-500">{row.original.cui}</div>
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
    cell: ({ row }) => (
      <Badge variant={row.original.statusFirma === 'ACTIVA' ? 'success' : 'destructive'}>
        {row.original.statusFirma}
      </Badge>
    ),
  },
  {
    accessorKey: 'enrichmentStatus',
    header: 'Enrichment',
    cell: ({ row }) => (
      <EnrichmentStatusBadge status={row.original.enrichmentStatus} />
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
    cell: ({ row }) => (
      <PromotionStatusBadge status={row.original.promotionStatus} />
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVerticalIcon className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(`/silver/companies/${row.original.id}`)}>
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleReEnrich(row.original.id)}>
            Re-enrich
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePromote(row.original.id)}>
            Promote to Gold
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function SilverCompaniesListPage() {
  const table = useTable({
    resource: 'silver-companies',
    pagination: { pageSize: 25 },
    sorters: { initial: [{ field: 'updatedAt', order: 'desc' }] },
    filters: { initial: [{ field: 'isMasterRecord', operator: 'eq', value: true }] },
  });
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Silver Companies</h1>
          <p className="text-sm text-gray-500">
            {table.tableQuery.data?.total || 0} companies validated
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleBulkEnrich}>
            <RefreshIcon className="w-4 h-4 mr-2" />
            Bulk Enrich
          </Button>
        </div>
      </div>
      
      {/* Advanced Filters */}
      <SilverCompanyFilters 
        filters={table.filters}
        setFilters={table.setFilters}
      />
      
      {/* Data Table */}
      <DataTable
        columns={columns}
        data={table.tableQuery.data?.data || []}
        isLoading={table.tableQuery.isLoading}
        pagination={{
          current: table.current,
          total: table.tableQuery.data?.total || 0,
          pageSize: table.pageSize,
          onChange: table.setCurrent,
        }}
        sorting={{
          sorters: table.sorters,
          setSorters: table.setSorters,
        }}
        rowSelection={{
          enabled: true,
          onSelectionChange: setSelectedRows,
        }}
      />
      
      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <BulkActionBar
          count={selectedRows.length}
          actions={[
            { label: 'Enrich Selected', onClick: handleBulkEnrich },
            { label: 'Promote Selected', onClick: handleBulkPromote },
            { label: 'Export Selected', onClick: handleExportSelected },
          ]}
          onClear={() => setSelectedRows([])}
        />
      )}
    </div>
  );
}
```

---

## 2.5 HITL Approval Inbox

**Route:** `/approvals`
**File:** `src/pages/approvals/list.tsx`

```tsx
// src/pages/approvals/list.tsx

import { useList } from '@refinedev/core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ApprovalsListPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  
  const { data: pendingData, isLoading: pendingLoading } = useList({
    resource: 'approvals',
    filters: [
      { field: 'status', operator: 'in', value: ['pending', 'assigned', 'in_review'] },
    ],
    sorters: [{ field: 'dueAt', order: 'asc' }],
  });
  
  const { data: completedData, isLoading: completedLoading } = useList({
    resource: 'approvals',
    filters: [
      { field: 'status', operator: 'in', value: ['approved', 'rejected', 'expired'] },
    ],
    sorters: [{ field: 'decidedAt', order: 'desc' }],
    pagination: { pageSize: 20 },
  });
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Approval Inbox</h1>
          <p className="text-sm text-gray-500">
            {pendingData?.total || 0} pending approvals
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingData?.total > 0 && (
              <Badge className="ml-2" variant="destructive">
                {pendingData.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : pendingData?.data?.length === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon className="w-12 h-12 text-green-500" />}
              title="All caught up!"
              description="No pending approvals"
            />
          ) : (
            <div className="space-y-3">
              {pendingData?.data?.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onClick={() => navigate(`/approvals/${approval.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed">
          <CompletedApprovalsList 
            data={completedData?.data || []}
            isLoading={completedLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApprovalCard({ approval, onClick }) {
  const urgency = getUrgencyLevel(approval.dueAt);
  
  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        urgency === 'critical' ? 'border-red-300 bg-red-50' :
        urgency === 'warning' ? 'border-orange-300 bg-orange-50' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ApprovalTypeBadge type={approval.approvalType} />
              <PriorityBadge priority={approval.priority} />
            </div>
            <h3 className="font-medium">{approval.entityTitle}</h3>
            <p className="text-sm text-gray-500">
              {approval.metadata?.reason || 'Review required'}
            </p>
          </div>
          <div className="text-right">
            <SLACountdown dueAt={approval.dueAt} />
            <div className="text-xs text-gray-500 mt-1">
              Created {formatRelative(approval.createdAt)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

**Document generat:** 15 Ianuarie 2026
**Total pagini:** 15+
