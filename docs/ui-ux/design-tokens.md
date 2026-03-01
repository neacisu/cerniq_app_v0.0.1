# Design Tokens

Sistemul de design **Cerniq.app** este implementat prin CSS Variables și utilitare Tailwind v4.

## 1. Culori

Paleta cromatică este inspirată de natură (agricultură), dar păstrează un aspect sharp, profesional (SaaS B2B).

### Primary (Brand)

- **Primary Green**: `hsl(142, 76%, 36%)` (Green-600) — Acțiuni principale, butoane, logo.
- **Primary Dark**: `hsl(145, 80%, 10%)` (Green-950) — Accente în dark mode.

### Secondary (Accents)

- **Harvest Gold**: `hsl(45, 93%, 47%)` (Amber-500) — Status "Pending", "Negotiation".
- **Soil Brown**: `hsl(25, 40%, 30%)` (Brown-800) — Elemente de fundal secundare.

### Semantic

- **Destructive**: `hsl(0, 84%, 60%)` (Red-500) — Ștergere, Erori (Banned phone).
- **Success**: `hsl(142, 70%, 45%)` (Green-500) — Succes (Sale closed).
- **Warning**: `hsl(38, 92%, 50%)` (Orange-500) — Atenționări (SLA Breach).
- **Info**: `hsl(217, 91%, 60%)` (Blue-500) — Informații neutre.

## 2. Tipografie

### Font Family

- **Sans**: `Inter`, system-ui, sans-serif.
- **Mono**: `JetBrains Mono`, monospace (pentru log-uri, JSON, CUI-uri).

### Scale

- **h1**: 2.25rem (36px), font-bold, tracking-tight.
- **h2**: 1.875rem (30px), font-semibold.
- **h3**: 1.5rem (24px), font-semibold.
- **body**: 1rem (16px), text-slate-700 (light) / text-slate-300 (dark).
- **small**: 0.875rem (14px).

## 3. Spacing & Radius

### Radius

- **Default**: `0.5rem` (8px) — Carduri, Input-uri.
- **Small**: `0.25rem` (4px) — Badge-uri, Checkbox.
- **Full**: `9999px` — Butoane "Pill", Avatare.

### Layout Z-Index

- **Modal**: 50
- **Drawer**: 40
- **Popover**: 30
- **Sticky Header**: 20
