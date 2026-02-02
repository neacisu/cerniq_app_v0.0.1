# CERNIQ.APP — UI/UX Documentation Index

## Frontend Design System & Components

**Locație:** `docs/ui-ux/`  
**Stack:** React 19.2.3, Tailwind 4.1, shadcn/ui, Refine v5  
**Actualizat:** 20 Ianuarie 2026

---

## DOCUMENTE ÎN ACEST FOLDER

| Document | Conținut | Link |
| -------- | -------- | ---- |
| [`frontend-stack.md`](./frontend-stack.md) | Tehnologii și framework-uri frontend | [View](./frontend-stack.md) |
| [`design-tokens.md`](./design-tokens.md) | Design tokens (culori, spacing, typography) | [View](./design-tokens.md) |
| [`components-list.md`](./components-list.md) | Lista componentelor UI planificate | [View](./components-list.md) |

---

## SUMAR STACK FRONTEND

### Framework Stack

| Tehnologie | Versiune | Rol |
| ---------- | -------- | --- |
| **React** | 19.2.3 | UI Library |
| **Refine** | v5 | Admin framework |
| **TanStack Query** | v5 | Data fetching |
| **TanStack Router** | v1 | Routing |
| **Tailwind CSS** | v4.1 | Styling |
| **shadcn/ui** | Latest | Component library |

### Design Tokens Preview

```css
/* Colors */
--primary: oklch(65% 0.22 250);
--secondary: oklch(75% 0.15 180);
--destructive: oklch(55% 0.25 25);

/* Spacing */
--spacing-sm: 0.5rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;

/* Radius */
--radius-sm: 0.25rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
```

### Key Components

| Categorie | Componente |
| --------- | ---------- |
| **Layout** | AppShell, Sidebar, Header |
| **Data Display** | DataTable, CompanyCard, LeadScoreBadge |
| **Forms** | ImportUploader, FilterPanel, SearchBox |
| **Feedback** | Toast, Modal, LoadingSpinner |

---

## INTEGRARE ÎN PROIECT

### Referințe din alte documente

| Document | Secțiune |
| -------- | -------- |
| [Master Specification](../specifications/master-specification.md) | §2.3 Frontend Architecture |
| [Architecture](../architecture/architecture.md) | Web App Component |
| [Getting Started](../developer-guide/getting-started.md) | Frontend Development |
| [ADR-0012](../adr/ADR%20Etapa%200/ADR-0012-React-19-cu-Refine-v5.md) | React 19 Decision |
| [ADR-0013](../adr/ADR%20Etapa%200/ADR-0013-Tailwind-CSS-v4-cu-Oxide-Engine.md) | Tailwind Decision |

### Locația Codului

```text
apps/web-admin/
├── src/
│   ├── components/       # UI Components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom hooks
│   ├── providers/        # Context providers
│   └── styles/           # Global styles, tokens
├── tailwind.config.ts
└── vite.config.ts
```

---

## DOCUMENTE CONEXE

- [Frontend Stack Details](./frontend-stack.md)
- [Design Tokens](./design-tokens.md)
- [Components List](./components-list.md)
- [Coding Standards](../developer-guide/coding-standards.md)

---

**Actualizat:** 20 Ianuarie 2026
