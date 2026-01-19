# State-of-the-art frontend documentation for Cerniq.app B2B sales automation platform

Cerniq.app's frontend stack—React 19, Tailwind CSS v4, and Refine v5—represents the cutting edge of enterprise dashboard development in 2026. This comprehensive documentation covers every aspect needed to build a modern, accessible, and performant B2B sales automation platform for the Romanian agricultural market, synthesizing the latest patterns from January 2025 to January 2026.

## React 19 fundamentals for enterprise admin dashboards

React 19 introduces transformative features that fundamentally change how admin dashboards are built. The **React Compiler** (React Forget), released October 2025, automatically memoizes components, eliminating the need for manual `useMemo` and `useCallback` in most cases—achieving **25-40% fewer re-renders** without code changes.

**Server Components** enable direct database access without API endpoints, delivering **38% faster initial loads** by rendering data-intensive components on the server:

```tsx
// Server Component - zero JavaScript shipped to client
export default async function DashboardPage() {
  const leads = await db.lead.findMany({
    where: { status: 'qualified' },
    include: { company: true, contacts: true }
  });
  
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LeadMetrics leads={leads} />
    </Suspense>
  );
}
```

The **useOptimistic** hook provides instant UI feedback while async operations complete—critical for responsive CRM interactions:

```tsx
const [optimisticLeads, addOptimisticLead] = useOptimistic(
  leads,
  (state, newLead) => [...state, { ...newLead, pending: true }]
);
```

**Server Actions** replace traditional REST APIs for CRUD operations, with `useActionState` and `useFormStatus` enabling sophisticated form handling with built-in pending states and error handling. The **use() hook** allows reading promises within components, enabling conditional data fetching impossible with `useContext`.

### Recommended architecture pattern

```
app/
├── admin/
│   ├── layout.tsx          # Server Component - shared layout
│   ├── dashboard/
│   │   ├── page.tsx        # Server Component - data fetching
│   │   └── components/
│   │       └── Charts.tsx  # Client Component - interactivity
│   └── actions/
│       └── lead.ts         # Server Actions - CRUD operations
```

## Tailwind CSS v4 transforms enterprise styling

Released January 22, 2025, Tailwind v4's **Oxide engine** delivers **5x faster full builds** and **100x faster incremental builds** (44ms → 5ms). The paradigm shift to **CSS-first configuration** using `@theme` eliminates JavaScript configuration files entirely:

```css
@import "tailwindcss";

@theme {
  /* B2B SaaS professional palette using OKLCH */
  --color-primary-500: oklch(0.62 0.21 260);
  --color-surface: oklch(0.985 0.003 248);
  --color-success: oklch(0.72 0.22 150);
  --color-warning: oklch(0.83 0.19 85);
  --color-error: oklch(0.64 0.24 25);
  
  /* Dashboard-specific tokens */
  --spacing-sidebar: 16rem;
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.05);
  --radius-dashboard: 0.5rem;
  
  /* Typography for enterprise interfaces */
  --font-display: "Inter", system-ui, sans-serif;
}
```

### Critical new features for dashboards

**Container queries** are now native (no plugin required), enabling truly component-based responsive design:

```html
<aside class="@container">
  <div class="p-2 @sm:p-4 @lg:p-6 grid @md:grid-cols-2">
    <!-- Responds to container, not viewport -->
  </div>
</aside>
```

**Dark mode** configuration moves to CSS with flexible selector strategies:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

New utilities include **3D transforms** (`rotate-x-45`, `translate-z-10`), **radial/conic gradients** (`bg-radial`, `bg-conic`), the **`not-*` variant** for negation patterns, and **dynamic grid values** (`grid-cols-13` without arbitrary syntax).

## Refine v5 powers headless admin framework

Refine v5 introduces **TanStack Query v5 integration** and **React 19 support** with a unified `meta` object replacing deprecated resource properties. The framework provides comprehensive CRUD hooks that integrate seamlessly with custom data providers.

### Essential CRUD operations

```typescript
// List with real-time updates
const { data, isLoading } = useList({
  resource: "agricultural_contacts",
  pagination: { current: 1, pageSize: 20 },
  sorters: [{ field: "enrichmentScore", order: "desc" }],
  filters: [
    { field: "tier", operator: "eq", value: "gold" },
    { field: "region", operator: "contains", value: "Transilvania" }
  ],
  liveMode: "auto", // Real-time WebSocket updates
});

// Optimistic update mutation
const { mutate: updateContact } = useUpdate();
updateContact({
  resource: "contacts",
  id: contactId,
  values: { stage: "qualified", enrichmentStatus: "verified" },
  mutationMode: "optimistic",
  invalidates: ["list", "many"],
});
```

### Authentication and access control

Refine's **AuthProvider** supports custom authentication flows, while **AccessControlProvider** enables RBAC with Casbin integration. The `useCan` hook and `<CanAccess>` component provide field-level permission control:

```tsx
<CanAccess resource="leads" action="delete">
  <DeleteButton />
</CanAccess>
```

### shadcn/ui integration

The official `@refinedev/shadcn` package provides headless UI implementation with full Tailwind v4 support. Combined with React Hook Form and Zod validation:

```tsx
const { ...form } = useForm({
  resolver: zodResolver(leadSchema),
  refineCoreProps: {
    redirect: "list",
    autoSave: { enabled: true, debounce: 1000 }
  }
});
```

## Modern UI/UX design system architecture

The recommended stack combines **shadcn/ui** (October 2025 added `Field`, `Item`, `Empty`, `Spinner`, `Kbd` components), **Radix UI primitives** for accessibility, and **TanStack Table v8** for data grids.

### Dashboard layout implementation

```tsx
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    <header className="sticky top-0 flex h-16 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumb>...</Breadcrumb>
    </header>
    <main className="flex flex-1 flex-col gap-4 p-6">
      {children}
    </main>
  </SidebarInset>
</SidebarProvider>
```

### Data visualization with Tremor

**Tremor** provides 35+ dashboard-optimized components built on Recharts, offering KPI cards, area charts, bar lists, and sparklines ideal for agricultural sales metrics:

```tsx
<Card>
  <AreaChart
    data={revenueData}
    index="month"
    categories={['Revenue', 'Target']}
    colors={['emerald', 'gray']}
    valueFormatter={(v) => `${v.toLocaleString()} RON`}
  />
</Card>
```

### Kanban pipeline with @dnd-kit

```tsx
<DndContext onDragEnd={handleDragEnd}>
  {['prospecting', 'qualified', 'proposal', 'negotiation', 'closed'].map(stage => (
    <DroppableColumn key={stage} id={stage}>
      <SortableContext items={deals[stage]} strategy={verticalListSortingStrategy}>
        {deals[stage].map(deal => <DraggableDealCard key={deal.id} deal={deal} />)}
      </SortableContext>
    </DroppableColumn>
  ))}
</DndContext>
```

## Data enrichment pipeline UI patterns

For Cerniq.app's contact enrichment pipeline (similar to Apollo.io, ZoomInfo), implement these visualization patterns:

### Pipeline progress visualization

```tsx
const EnrichmentStages = [
  { key: 'validate', label: 'Validating Data' },
  { key: 'dedupe', label: 'Deduplication' },
  { key: 'enrich', label: 'Enriching Contacts' },
  { key: 'verify', label: 'Verification' },
  { key: 'export', label: 'Export Ready' }
];

<Steps current={currentStage}>
  {EnrichmentStages.map(stage => (
    <Step 
      key={stage.key} 
      title={stage.label}
      status={getStageStatus(stage.key)}
    />
  ))}
</Steps>
```

### Queue monitoring with Bull-Board patterns

Display essential metrics: **waiting**, **active**, **completed**, **failed**, **delayed** counts, with job actions (pause, retry, cancel) and throughput rate visualization. Bull-Board's architecture provides the UI model for displaying queue state with custom formatters for job data.

### Real-time updates architecture

**SSE (Server-Sent Events)** suits one-way dashboard updates (queue stats, job progress), while **WebSockets** handle bidirectional needs (job control commands). The `react-use-websocket` library provides automatic reconnection:

```tsx
const { lastJsonMessage, readyState } = useWebSocket(
  'wss://api.cerniq.app/queue-updates',
  {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    share: true, // Singleton connection
  }
);
```

Integrate with TanStack Query for cache invalidation on real-time events:

```tsx
socket.onmessage = (event) => {
  const { type, payload } = JSON.parse(event.data);
  if (type === 'CONTACT_ENRICHED') {
    queryClient.setQueryData(['contacts', payload.id], payload);
  }
};
```

## Contact management UI for agricultural B2B

### Bronze/Silver/Gold tier visualization

Implement tiered scoring with visual indicators combining color and iconography (never color alone for accessibility):

| Tier | Threshold | Indicator | Meaning |
|------|-----------|-----------|---------|
| Bronze | 0-40 | 🥉 + orange badge | Basic data, needs enrichment |
| Silver | 41-70 | 🥈 + blue badge | Partial enrichment, moderate confidence |
| Gold | 71-100 | 🥇 + green badge | Full enrichment, high confidence |

Display tier prominently in contact card headers with drill-down capability showing scoring breakdown: "Visited pricing page 3x," "Job title matches ICP," "Company in target region."

### Contact card architecture

```tsx
<Card>
  <CardHeader>
    <Avatar src={contact.photo} fallback={contact.initials} />
    <div>
      <h3>{contact.name}</h3>
      <p>{contact.title} at {contact.company}</p>
    </div>
    <TierBadge tier={contact.tier} score={contact.enrichmentScore} />
  </CardHeader>
  <CardContent>
    <QuickActions>
      <CallButton phone={contact.phone} />
      <EmailButton email={contact.email} />
      <AddNoteButton contactId={contact.id} />
    </QuickActions>
    <EnrichmentStatus status={contact.enrichmentStatus} lastUpdated={contact.lastEnriched} />
  </CardContent>
</Card>
```

### Enrichment status indicators

- **Verified**: Green checkmark with solid badge, confidence percentage
- **Pending**: Yellow clock icon with animated spinner
- **Failed**: Red X with retry action, error categorization (transient vs permanent)
- **Partial**: Half-filled indicator showing which fields enriched vs. manual

### Advanced filtering with saved views

```tsx
<FilterBar>
  <FilterGroup label="Contact Information">
    <TextFilter field="name" />
    <TextFilter field="email" />
    <SelectFilter field="region" options={romanianRegions} />
  </FilterGroup>
  <FilterGroup label="Enrichment">
    <SelectFilter field="tier" options={['bronze', 'silver', 'gold']} />
    <SelectFilter field="enrichmentStatus" options={['verified', 'pending', 'failed']} />
    <RangeFilter field="enrichmentScore" min={0} max={100} />
  </FilterGroup>
  <SavedViewsDropdown views={userSavedViews} onApply={applyView} />
  <ActiveFilters chips={activeFilters} onClear={clearFilter} onClearAll={clearAll} />
</FilterBar>
```

### Bulk operations UX

Implement checkbox-based selection with contextual action bar appearing on selection:

```tsx
{selectedCount > 0 && (
  <BulkActionBar>
    <span>{selectedCount} selected</span>
    <Button variant="outline" onClick={bulkEnrich}>Enrich</Button>
    <Button variant="outline" onClick={bulkAssign}>Assign</Button>
    <Button variant="outline" onClick={bulkExport}>Export</Button>
    <AlertDialog trigger={<Button variant="destructive">Delete</Button>}>
      <AlertDialogContent>
        <AlertDialogTitle>Delete {selectedCount} contacts?</AlertDialogTitle>
        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={bulkDelete}>Confirm Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </BulkActionBar>
)}
```

## Accessibility compliance for WCAG 2.2

WCAG 2.2 (December 2024) adds **9 new success criteria**. For AA compliance, Cerniq.app must address:

### Critical new requirements

- **2.4.11 Focus Not Obscured**: Sticky headers must not fully cover focused elements. Use `scroll-padding-top` in CSS.
- **2.5.7 Dragging Movements**: Provide alternatives to drag operations (up/down buttons for Kanban, number inputs for sliders).
- **2.5.8 Target Size**: Minimum **24×24px** touch targets (44×44px recommended for mobile).
- **3.3.8 Accessible Authentication**: Support password managers, enable copy-paste in password fields.

### Keyboard navigation implementation

```tsx
function DashboardToolbar({ items }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemsRef = useRef([]);

  const handleKeyDown = (e, index) => {
    let newIndex = index;
    switch (e.key) {
      case 'ArrowRight': newIndex = (index + 1) % items.length; break;
      case 'ArrowLeft': newIndex = (index - 1 + items.length) % items.length; break;
      case 'Home': newIndex = 0; break;
      case 'End': newIndex = items.length - 1; break;
    }
    setActiveIndex(newIndex);
    itemsRef.current[newIndex]?.focus();
  };

  return (
    <div role="toolbar" aria-label="Dashboard actions">
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={el => itemsRef.current[index] = el}
          tabIndex={index === activeIndex ? 0 : -1}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

### Screen reader support with live regions

```tsx
<div role="status" aria-live="polite" aria-atomic="false">
  {notifications.map(n => <p key={n.id}>{n.message}</p>)}
</div>
```

Use **React Aria** library for complex components (dialogs, menus, tables) with automatic focus management and ARIA attributes.

## Performance optimization strategies

### Core Web Vitals targets (2025)

| Metric | Target | Implementation |
|--------|--------|----------------|
| LCP | ≤2.5s | Priority loading for hero content, image optimization |
| INP | ≤200ms | React Compiler, optimistic updates, code splitting |
| CLS | ≤0.1 | Skeleton screens, reserved dimensions for async content |

### Virtual scrolling for large contact lists

TanStack Virtual enables smooth rendering of **10,000+ rows**:

```tsx
const rowVirtualizer = useVirtualizer({
  count: contacts.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72,
  overscan: 10,
});

{rowVirtualizer.getVirtualItems().map((virtualRow) => (
  <div
    key={virtualRow.key}
    style={{
      position: 'absolute',
      top: 0,
      transform: `translateY(${virtualRow.start}px)`,
      height: `${virtualRow.size}px`,
    }}
  >
    <ContactRow contact={contacts[virtualRow.index]} />
  </div>
))}
```

### Code splitting strategy

```tsx
// Route-based splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Pipeline = lazy(() => import('./pages/Pipeline'));

// Component-based splitting for heavy features
const ChartLibrary = lazy(() => import('./components/Charts'));
const RichTextEditor = lazy(() => import('./components/Editor'));
```

### Optimistic updates with TanStack Query

```tsx
const updateContact = useMutation({
  mutationFn: updateContactAPI,
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['contacts']);
    const previous = queryClient.getQueryData(['contacts']);
    queryClient.setQueryData(['contacts'], old =>
      old.map(c => c.id === newData.id ? { ...c, ...newData } : c)
    );
    return { previous };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(['contacts'], context.previous);
  },
  onSettled: () => queryClient.invalidateQueries(['contacts']),
});
```

## Component library and design tokens

### Recommended stack for Cerniq.app

```
Frontend Architecture:
├── React 19 (Server Components + Client Components)
├── Tailwind CSS v4 (Oxide engine, @theme configuration)
├── Refine v5 (headless admin framework)
├── shadcn/ui (Mira style for dense B2B interfaces)
├── Radix UI Primitives (accessibility foundation)
├── TanStack Table v8 (data grids)
├── TanStack Virtual (virtualization)
├── TanStack Query v5 (server state)
├── Tremor (data visualization)
├── @dnd-kit (Kanban drag-and-drop)
├── React Hook Form + Zod (form handling)
├── Zustand (global client state)
└── Sonner (toast notifications)
```

### Design token structure

```css
@import "tailwindcss";

@theme {
  /* Scale - consistent spacing */
  --spacing: 0.25rem;
  
  /* Colors - semantic naming */
  --color-background: oklch(0.99 0 0);
  --color-foreground: oklch(0.15 0.02 260);
  --color-primary: oklch(0.55 0.24 263);
  --color-muted: oklch(0.96 0.003 265);
  --color-border: oklch(0.90 0.01 265);
  
  /* Status colors */
  --color-success: oklch(0.72 0.22 150);
  --color-warning: oklch(0.83 0.19 85);
  --color-error: oklch(0.64 0.24 25);
  
  /* Tier colors for enrichment */
  --color-tier-bronze: oklch(0.65 0.12 55);
  --color-tier-silver: oklch(0.75 0.03 255);
  --color-tier-gold: oklch(0.78 0.15 85);
  
  /* Layout */
  --sidebar-width: 240px;
  --header-height: 56px;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

## Conclusion

Cerniq.app's frontend architecture leverages the most advanced React ecosystem available in 2026. Key implementation priorities:

1. **React 19 Server Components** for data-intensive dashboard views, reducing client JavaScript by 40%+ while enabling direct database access
2. **Tailwind CSS v4's CSS-first configuration** with OKLCH colors for P3 wide-gamut displays and native container queries for component-responsive design
3. **Refine v5's headless architecture** with shadcn/ui providing full customization while maintaining enterprise-grade CRUD patterns
4. **Real-time pipeline monitoring** using SSE for status updates and WebSockets for bidirectional control, integrated with TanStack Query cache invalidation
5. **Bronze/Silver/Gold tier system** with clear visual indicators, enrichment status displays, and advanced filtering for Romanian agricultural contacts
6. **WCAG 2.2 AA compliance** with 24px minimum touch targets, keyboard navigation patterns, and React Aria for complex components
7. **Performance optimization** through React Compiler automatic memoization, TanStack Virtual for lists exceeding 100 items, and aggressive code splitting

This documentation provides the complete foundation for building a world-class B2B sales automation platform that meets 2026 enterprise standards for accessibility, performance, and user experience.