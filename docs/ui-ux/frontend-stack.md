# CERNIQ.APP — Frontend Stack (Detaliat)

## Build & Dev Server

| Pachet | Versiune | Rol |
|--------|----------|-----|
| **Vite** | 7.3.1 | Build tool, HMR, dev server |
| **@vitejs/plugin-react** | 5.1.1 | React Fast Refresh |
| **@tailwindcss/vite** | — | Tailwind v4 integration (Oxide engine) |

---

## React

| Pachet | Versiune | Rol |
|--------|----------|-----|
| **React** | 19 | Server Components, useOptimistic, Activity API |
| **babel-plugin-react-compiler** | — | React Compiler (12% faster loads, 2.5x faster interactions) |

---

## Tailwind CSS v4

- **Config:** `@theme` directive în CSS — **NU** `tailwind.config.js`
- **Engine:** Oxide (Rust) — 3.5–5x faster builds
- **Culori:** OKLCH P3 wide-gamut nativ

---

## Refine v5

| Pachet | Rol |
|--------|-----|
| **@refinedev/core** | Headless admin framework |
| **@refinedev/react-router** | Routing integration |
| **@refinedev/react-table** | TanStack Table integration |

---

## shadcn/ui

- Primitives Radix UI customizate pentru **Dark Terroir**
- Componente copiate în proiect (nu dependency)
- Stilizare via Tailwind + design tokens

---

## Lucide React

- **51 iconițe** mapate pentru navigare și acțiuni
- Import: `import { IconName } from 'lucide-react'`

---

## Fonturi (Google Fonts)

| Rol | Font | Utilizare |
|-----|------|-----------|
| **Display** | Bricolage Grotesque | Headings, logo, KPI numbers |
| **Body** | DM Sans | Text, tabele, labels |
| **Monospace** | Geist Mono | CUI, coduri, date numerice |

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=DM+Sans:ital,opsz,wght@0,9..40,300..700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## Tooling

| Tool | Versiune | Rol |
|------|----------|-----|
| **ESLint** | 9.39+ | Linting |
| **Prettier** | — | Formatare |
| **TypeScript** | strict mode | Type safety |
