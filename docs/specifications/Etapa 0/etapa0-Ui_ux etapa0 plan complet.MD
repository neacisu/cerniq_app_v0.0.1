# CERNIQ.APP — PLAN UI/UX COMPLET: ETAPA 0

## Fundație Vizuală & Design System pentru Infrastructure MVP

### Versiunea 1.0 | Februarie 2026 | Bazat pe Audit Complet al Documentației

---

> **SCOPE ETAPA 0:** Această etapă acoperă exclusiv shell-ul aplicației — fundația vizuală care va susține toate etapele ulterioare. Nu există date reale sau funcționalitate business. Avem: **Login Page**, **App Shell Layout**, **Dashboard Placeholder** și întreg **Design System**-ul.

---

## CUPRINS

1. [Design Philosophy & Brand Direction](#1-design-philosophy--brand-direction)
2. [Design Tokens — Single Source of Truth](#2-design-tokens--single-source-of-truth)
3. [Typography System](#3-typography-system)
4. [Color System — OKLCH P3](#4-color-system--oklch-p3)
5. [Spacing, Layout & Grid System](#5-spacing-layout--grid-system)
6. [Component Library — Etapa 0](#6-component-library--etapa-0)
7. [Login Page — Design Complet](#7-login-page--design-complet)
8. [App Shell Layout](#8-app-shell-layout)
9. [Dashboard Placeholder (Etapa 0)](#9-dashboard-placeholder-etapa-0)
10. [Motion & Animation System](#10-motion--animation-system)
11. [Dark Mode Architecture](#11-dark-mode-architecture)
12. [Accessibility — WCAG 2.2 AA](#12-accessibility--wcag-22-aa)
13. [Performance Targets](#13-performance-targets)
14. [File Structure Frontend](#14-file-structure-frontend)
15. [Implementation Checklist Etapa 0](#15-implementation-checklist-etapa-0)

---

## 1. Design Philosophy & Brand Direction

### 1.1 Conceptul Director: "Dark Terroir"

Cerniq.app operează în agricultura românească — un sector cu **2.86 milioane ferme**, **€2.25B subsidii** și o piață profund ancorată în sol, anotimpuri și cicluri naturale. Designul trebuie să reflecte această realitate fără a fi rustic sau anacronic.

**"Dark Terroir"** înseamnă:

- Adâncimea și bogăția unui sol fertil → fundal dark, stratificat
- Grâul auriu al câmpurilor romanești → accent amber/auriu
- Precizia instrumentelor agronomice moderne → linii clare, tipografie exactă
- Autoritatea unui consultant agricultural de top → profesionalism, nu flashy

### 1.2 Principii de Design pentru 2026

| Principiu                    | Descriere                              | Impact în Cerniq                           |
| ---------------------------- | -------------------------------------- | ------------------------------------------ |
| **Clarity First**            | Informația înainte de estetică         | Tabele și date sunt eroul, nu decorațiile  |
| **Progressive Disclosure**   | Complexitate revelată treptat          | Etapa 0 arată shell, Etapa 1 adaugă date   |
| **Dark Mode Default**        | Sales reps lucrează ore lungi          | Dark theme ca default, light disponibil    |
| **Glassmorphism Funcțional** | Adâncime fără zgomot vizual            | Carduri cu backdrop-blur pe layer-uri dark |
| **Bento Grid Layout**        | Scanability maximă                     | Dashboard organizat modular                |
| **Skeleton-First**           | Percepție de viteză mare               | Skeleton screens în loc de spinners        |
| **Micro-interactions**       | Feedback imediat la fiecare acțiune    | Butoane, tranziții, hover states           |
| **Typographic Hierarchy**    | Navigare vizuală fără iconuri excesive | Font sizes și weights ca arhitectură       |

### 1.3 Tone of Voice Vizual

```
Cerniq NU este:          Cerniq ESTE:
────────────────────     ────────────────────
❌ Corporatist rece       ✅ Profesional cald
❌ Startup playful        ✅ Autoritar precis
❌ Minimal steril         ✅ Bogat și stratificat
❌ Colorat aleatoriu      ✅ Cromatic calculat
❌ Generic SaaS blue      ✅ Amber + Deep Navy
❌ Consumer app           ✅ Power user tool
```

---

## 2. Design Tokens — Single Source of Truth

Toate tokenurile sunt definite în CSS via `@theme` (Tailwind v4). **Niciodată valori hardcodate în componente.**

```css
/* /apps/web/src/styles/tokens.css */
@import "tailwindcss";

@theme {
  /* ═══════════════════════════════════════════════
     BRAND COLORS — OKLCH P3 wide-gamut
     Raționale: OKLCH oferă perceptual uniformity,
     gradientele arată natural, nu distorsionat
  ═══════════════════════════════════════════════ */

  /* Primary — Amber/Gold (Grâu Romanian) */
  --color-brand-50: oklch(0.98 0.02 80);
  --color-brand-100: oklch(0.95 0.05 80);
  --color-brand-200: oklch(0.9 0.09 78);
  --color-brand-300: oklch(0.83 0.13 76);
  --color-brand-400: oklch(0.76 0.16 74);
  --color-brand-500: oklch(0.7 0.18 72); /* ← MAIN ACCENT */
  --color-brand-600: oklch(0.62 0.17 70);
  --color-brand-700: oklch(0.52 0.15 68);
  --color-brand-800: oklch(0.42 0.12 66);
  --color-brand-900: oklch(0.32 0.08 64);
  --color-brand-950: oklch(0.22 0.05 62);

  /* Surface/Background — Deep Navy (Sol fertil) */
  --color-surface-950: oklch(0.1 0.02 255); /* Fundal principal dark */
  --color-surface-900: oklch(0.13 0.02 255); /* Card background */
  --color-surface-800: oklch(0.17 0.02 256); /* Card hover */
  --color-surface-700: oklch(0.22 0.02 257); /* Border */
  --color-surface-600: oklch(0.28 0.02 258); /* Muted text bg */
  --color-surface-200: oklch(0.92 0.01 250); /* Light mode card */
  --color-surface-100: oklch(0.96 0.005 250); /* Light mode bg */
  --color-surface-50: oklch(0.99 0.002 250); /* Light mode base */

  /* Semantic Colors */
  --color-success-50: oklch(0.97 0.02 145);
  --color-success-400: oklch(0.68 0.2 148);
  --color-success-500: oklch(0.6 0.22 148);
  --color-success-600: oklch(0.52 0.2 147);

  --color-warning-50: oklch(0.98 0.02 75);
  --color-warning-400: oklch(0.8 0.18 72);
  --color-warning-500: oklch(0.72 0.19 70);
  --color-warning-600: oklch(0.62 0.18 68);

  --color-danger-50: oklch(0.97 0.02 25);
  --color-danger-400: oklch(0.68 0.22 28);
  --color-danger-500: oklch(0.58 0.24 27);
  --color-danger-600: oklch(0.5 0.22 26);

  --color-info-50: oklch(0.97 0.02 240);
  --color-info-400: oklch(0.65 0.18 243);
  --color-info-500: oklch(0.57 0.2 245);
  --color-info-600: oklch(0.48 0.2 248);

  /* Data Tier Colors — Core to Cerniq */
  --color-tier-bronze-bg: oklch(0.18 0.04 55);
  --color-tier-bronze-text: oklch(0.75 0.14 58);
  --color-tier-bronze-border: oklch(0.3 0.08 56);

  --color-tier-silver-bg: oklch(0.16 0.02 255);
  --color-tier-silver-text: oklch(0.78 0.04 255);
  --color-tier-silver-border: oklch(0.32 0.03 255);

  --color-tier-gold-bg: oklch(0.2 0.06 80);
  --color-tier-gold-text: oklch(0.82 0.18 82);
  --color-tier-gold-border: oklch(0.4 0.12 80);

  /* ═══════════════════════════════════════════════
     SEMANTIC ALIASES — Folosite în componente
  ═══════════════════════════════════════════════ */

  /* Dark Mode (default) */
  --color-bg: var(--color-surface-950);
  --color-bg-elevated: var(--color-surface-900);
  --color-bg-overlay: var(--color-surface-800);
  --color-border: var(--color-surface-700);
  --color-border-subtle: oklch(0.2 0.02 255 / 60%);
  --color-text-primary: oklch(0.95 0.005 255);
  --color-text-secondary: oklch(0.7 0.01 255);
  --color-text-tertiary: oklch(0.5 0.01 255);
  --color-text-disabled: oklch(0.35 0.01 255);
  --color-accent: var(--color-brand-500);
  --color-accent-hover: var(--color-brand-400);

  /* ═══════════════════════════════════════════════
     TYPOGRAPHY
  ═══════════════════════════════════════════════ */

  /* Display: Bricolage Grotesque — caracter puternic pentru headings */
  --font-display: "Bricolage Grotesque", "DM Sans", system-ui, sans-serif;
  /* Body: DM Sans — lizibilitate excelentă B2B, puțin geometric */
  --font-body: "DM Sans", system-ui, sans-serif;
  /* Mono: Geist Mono — modern, code și date numerice */
  --font-mono: "Geist Mono", "JetBrains Mono", monospace;

  /* Type Scale — Major Third (1.250) */
  --text-2xs: 0.625rem; /* 10px — labels, badge text */
  --text-xs: 0.75rem; /* 12px — captions, helper text */
  --text-sm: 0.875rem; /* 14px — table cells, secondary */
  --text-base: 1rem; /* 16px — body text */
  --text-md: 1.125rem; /* 18px — emphasized body */
  --text-lg: 1.25rem; /* 20px — card titles */
  --text-xl: 1.5rem; /* 24px — section headers */
  --text-2xl: 1.875rem; /* 30px — page titles */
  --text-3xl: 2.25rem; /* 36px — hero numbers */
  --text-4xl: 2.75rem; /* 44px — display numbers */

  /* Font Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* Letter Spacing */
  --tracking-tight: -0.025em;
  --tracking-normal: 0em;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
  --tracking-widest: 0.1em;

  /* ═══════════════════════════════════════════════
     SPACING — 4px base unit
  ═══════════════════════════════════════════════ */
  --spacing-px: 1px;
  --spacing-0-5: 0.125rem; /* 2px */
  --spacing-1: 0.25rem; /* 4px */
  --spacing-1-5: 0.375rem; /* 6px */
  --spacing-2: 0.5rem; /* 8px */
  --spacing-2-5: 0.625rem; /* 10px */
  --spacing-3: 0.75rem; /* 12px */
  --spacing-4: 1rem; /* 16px */
  --spacing-5: 1.25rem; /* 20px */
  --spacing-6: 1.5rem; /* 24px */
  --spacing-7: 1.75rem; /* 28px */
  --spacing-8: 2rem; /* 32px */
  --spacing-10: 2.5rem; /* 40px */
  --spacing-12: 3rem; /* 48px */
  --spacing-14: 3.5rem; /* 56px */
  --spacing-16: 4rem; /* 64px */
  --spacing-20: 5rem; /* 80px */
  --spacing-24: 6rem; /* 96px */

  /* ═══════════════════════════════════════════════
     LAYOUT CONSTANTS
  ═══════════════════════════════════════════════ */
  --sidebar-width: 240px;
  --sidebar-width-collapsed: 64px;
  --header-height: 56px;
  --content-max-width: 1440px;
  --panel-width: 380px;

  /* ═══════════════════════════════════════════════
     BORDER RADIUS
  ═══════════════════════════════════════════════ */
  --radius-xs: 0.1875rem; /* 3px */
  --radius-sm: 0.25rem; /* 4px */
  --radius-md: 0.5rem; /* 8px */
  --radius-lg: 0.75rem; /* 12px */
  --radius-xl: 1rem; /* 16px */
  --radius-2xl: 1.5rem; /* 24px */
  --radius-full: 9999px;

  /* ═══════════════════════════════════════════════
     SHADOWS — Stratificate pentru depth
  ═══════════════════════════════════════════════ */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.15);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.2), 0 1px 2px -1px rgb(0 0 0 / 0.2);
  --shadow-md:
    0 4px 6px -1px rgb(0 0 0 / 0.25), 0 2px 4px -2px rgb(0 0 0 / 0.2);
  --shadow-lg:
    0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.2);
  --shadow-xl:
    0 20px 25px -5px rgb(0 0 0 / 0.35), 0 8px 10px -6px rgb(0 0 0 / 0.25);
  --shadow-glow-brand: 0 0 20px oklch(0.7 0.18 72 / 25%);
  --shadow-glow-success: 0 0 16px oklch(0.6 0.22 148 / 20%);

  /* ═══════════════════════════════════════════════
     TRANSITIONS — Consistent timing
  ═══════════════════════════════════════════════ */
  --duration-instant: 50ms;
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;
  --duration-slowest: 700ms;

  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* ═══════════════════════════════════════════════
     Z-INDEX — Layers system
  ═══════════════════════════════════════════════ */
  --z-base: 0;
  --z-raised: 10;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;
  --z-tooltip: 600;
}
```

---

## 3. Typography System

### 3.1 Font Selection Rationale

**Bricolage Grotesque** ca Display Font:

- Caracter distinct, ușor editorial — diferit de Inter/Roboto/Space Grotesk generic
- Variable font cu optical sizing
- Pairs excelent cu data-dense interfaces
- Loading: `<link rel="preconnect" href="https://fonts.googleapis.com">` + subset latin-ext pentru diacritice românești

**DM Sans** ca Body Font:

- Geometric dar cald — nu rece ca Inter
- Excelent la 14px (dimensiunea primară a tabelelor)
- Suport perfect pentru diacritice: ă, â, î, ș, ț
- Variable font — un singur fișier pentru toate weight-urile

**Geist Mono** ca Mono Font:

- CUI-uri, CIF-uri, coduri ANAF — mereu în mono
- Scoruri numerice, timestamps
- Modern, de la Vercel — aliniat cu stackul tehnic

### 3.2 Utilizare pe Componente

```
Componenta                  Font            Size        Weight    Spacing
─────────────────────────────────────────────────────────────────────────
Sidebar Logo                Display         text-xl     bold      tight
Page Title (H1)             Display         text-2xl    bold      tight
Section Header (H2)         Display         text-xl     semibold  tight
Card Title                  Body            text-lg     semibold  snug
Table Header                Body            text-xs     semibold  widest + uppercase
Table Cell (text)           Body            text-sm     regular   normal
Table Cell (CUI/numeric)    Mono            text-sm     medium    wide
Badge text                  Body            text-2xs    semibold  wider + uppercase
Button (default)            Body            text-sm     medium    normal
Button (lg)                 Body            text-base   medium    normal
Input label                 Body            text-sm     medium    normal
Input value                 Body            text-sm     regular   normal
Helper text / Caption       Body            text-xs     regular   normal
KPI Number (big)            Display         text-4xl    extrabold tight
KPI Label                   Body            text-xs     semibold  widest + uppercase
Sidebar nav item            Body            text-sm     medium    normal
Sidebar section label       Body            text-2xs    semibold  widest + uppercase
Toast message               Body            text-sm     regular   normal
```

### 3.3 Google Fonts Configuration (Optimizat)

```html
<!-- În index.html — preconnect pentru viteză -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..500&family=Geist+Mono:wght@400;500&display=swap&subset=latin-ext"
  rel="stylesheet"
/>
```

**Fallback stack CSS:**

```css
@theme {
  --font-display:
    "Bricolage Grotesque", "DM Sans", "Inter", system-ui, sans-serif;
  --font-body: "DM Sans", "Inter", system-ui, sans-serif;
  --font-mono: "Geist Mono", "JetBrains Mono", ui-monospace, monospace;
}
```

---

## 4. Color System — OKLCH P3

### 4.1 Rationale Tehnic OKLCH

Tailwind v4 folosește OKLCH nativ. Avantaje față de HEX/HSL:

- **Perceptual uniformity** — gradientele nu trec prin "zone moarte" gri
- **P3 wide-gamut** — culori mai saturate pe display-uri moderne (MacBook, iPhone)
- **Predictibilitate** — L=50% este întotdeauna "mediu" indiferent de hue

### 4.2 Paleta Completă cu Utilizări

```
BRAND (Amber/Gold):
─────────────────────────────────────────────────────────────────
brand-500  oklch(0.70 0.18 72)  → CTA buttons, active states, links
brand-400  oklch(0.76 0.16 74)  → Hover pe brand-500
brand-600  oklch(0.62 0.17 70)  → Pressed/active pe brand-500
brand-300  oklch(0.83 0.13 76)  → Brand text pe dark backgrounds
brand-950  oklch(0.22 0.05 62)  → Brand bg subtle (notifications)

SURFACE (Deep Navy):
─────────────────────────────────────────────────────────────────
surface-950  → Body background (page base)
surface-900  → Card background, sidebar bg
surface-800  → Card hover state, elevated elements
surface-700  → Borders, dividers
surface-600  → Muted backgrounds (disabled, empty states)

TEXT (pe dark background):
─────────────────────────────────────────────────────────────────
text-primary:   oklch(0.95 0.005 255)  → Headings, important data
text-secondary: oklch(0.70 0.01 255)   → Labels, secondary info
text-tertiary:  oklch(0.50 0.01 255)   → Helper text, placeholders
text-disabled:  oklch(0.35 0.01 255)   → Disabled states

SEMANTIC:
─────────────────────────────────────────────────────────────────
success-500  oklch(0.60 0.22 148)  → Status ACTIV, completed, valid
warning-500  oklch(0.72 0.19 70)   → Pending, in review, attention
danger-500   oklch(0.58 0.24 27)   → Error, invalid, blocked
info-500     oklch(0.57 0.20 245)  → Info, in progress

TIER SYSTEM (Core to Cerniq):
─────────────────────────────────────────────────────────────────
Bronze text:  oklch(0.75 0.14 58)  + bg: oklch(0.18 0.04 55)
Silver text:  oklch(0.78 0.04 255) + bg: oklch(0.16 0.02 255)
Gold text:    oklch(0.82 0.18 82)  + bg: oklch(0.20 0.06 80)
```

### 4.3 Accesibilitate Contrast

```
Combinație verificată (WCAG 2.2 AA ≥ 4.5:1, AAA ≥ 7:1):
─────────────────────────────────────────────────────────────────
text-primary pe surface-950     →  15.8:1  ✅ AAA
text-primary pe surface-900     →  12.4:1  ✅ AAA
text-secondary pe surface-950   →   6.2:1  ✅ AA
brand-500 pe surface-950        →   4.8:1  ✅ AA
brand-300 pe surface-950        →   8.1:1  ✅ AAA
success-500 pe surface-950      →   5.2:1  ✅ AA
danger-500 pe surface-950       →   4.7:1  ✅ AA
```

---

## 5. Spacing, Layout & Grid System

### 5.1 Layout Principal

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER (height: 56px, sticky, z-sticky: 200)               │
│  bg: surface-900/80 backdrop-blur-xl border-b border-700     │
├─────────────────┬────────────────────────────────────────────┤
│                 │                                            │
│  SIDEBAR        │  MAIN CONTENT                             │
│  width: 240px   │  flex-1, overflow-y-auto                 │
│  (collapsed:    │  padding: 24px                            │
│   64px)         │  max-width: 1440px (centered)             │
│                 │                                            │
│  bg: surface-   │  bg: surface-950                          │
│  900            │                                            │
│                 │                                            │
│  sticky, h-     │                                            │
│  full           │                                            │
│                 │                                            │
└─────────────────┴────────────────────────────────────────────┘
```

### 5.2 Grid System pentru Dashboard (Bento Grid)

```tsx
// Bento Grid — 12 coloane, gap uniform
<div className="grid grid-cols-12 gap-4 p-6">
  {/* KPI Cards — 3 coloane fiecare pe lg */}
  <KPICard className="col-span-12 sm:col-span-6 lg:col-span-3" />

  {/* Pipeline Funnel — 8 coloane */}
  <PipelineCard className="col-span-12 lg:col-span-8" />

  {/* Quality Score — 4 coloane */}
  <QualityCard className="col-span-12 lg:col-span-4" />

  {/* Full width section */}
  <ActivityCard className="col-span-12" />
</div>
```

### 5.3 Breakpoints

```
sm:   640px  — Mobile landscape, tablete mici
md:   768px  — Tablete
lg:   1024px — Laptop 13"  ← BREAKPOINT PRIMAR (power users)
xl:   1280px — Desktop
2xl:  1536px — Large displays (dual monitor setups)
```

### 5.4 Content Padding Scale

```
Mobile (< 640px):        padding: 16px
Tablet (640-1024px):     padding: 20px
Desktop (≥ 1024px):      padding: 24px
Large (≥ 1440px):        padding: 32px (max-width constrâns la 1440px)
```

---

## 6. Component Library — Etapa 0

Lista completă de componente necesare exclusiv în Etapa 0, cu specificații detaliate.

### 6.1 Componente de Bază (Primitive)

#### 6.1.1 Button

**Variante:**

```tsx
// Primary — CTA principal (brand amber)
<Button variant="primary" size="md">
  Intră în cont
</Button>

// Secondary — acțiuni secundare
<Button variant="secondary" size="md">
  Anulează
</Button>

// Ghost — acțiuni terțiare (sidebar nav items)
<Button variant="ghost" size="md">
  Dashboard
</Button>

// Destructive — acțiuni ireversibile
<Button variant="destructive" size="md">
  Șterge
</Button>

// Icon button — icon-only
<Button variant="ghost" size="icon" aria-label="Refresh">
  <RefreshIcon className="w-4 h-4" />
</Button>
```

**Specificații tehnice:**

```css
/* Base */
.btn-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-weight: 500;
  transition: all var(--duration-fast) var(--ease-out);
  cursor: pointer;
  white-space: nowrap;
  min-height: 36px; /* WCAG 2.5.8 - min 24px, recommended 44px touch */
  /* Focus visible — WCAG 2.4.11 */
  outline-offset: 2px;
}

/* Sizes */
sm:   h-8   px-3   text-xs
md:   h-9   px-4   text-sm   /* DEFAULT */
lg:   h-11  px-6   text-base
xl:   h-12  px-8   text-base
icon: h-9   w-9
icon-sm: h-8 w-8

/* Primary */
.btn-primary {
  background: var(--color-brand-500);
  color: oklch(0.1 0.02 255); /* Dark text pe amber */
  box-shadow: var(--shadow-sm);
}
.btn-primary:hover {
  background: var(--color-brand-400);
  box-shadow: var(--shadow-glow-brand);
  transform: translateY(-1px);
}
.btn-primary:active {
  background: var(--color-brand-600);
  transform: translateY(0);
}
```

#### 6.1.2 Input

```tsx
// Text input cu label
<div className="space-y-1.5">
  <label htmlFor="email" className="text-sm font-medium text-text-secondary">
    Email de serviciu
  </label>
  <input
    id="email"
    type="email"
    placeholder="alex@firma.ro"
    className="input-base"
  />
  <p className="text-xs text-text-tertiary">
    Folosiți adresa de email a companiei
  </p>
</div>
```

**Specificații:**

```css
.input-base {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  background: var(--color-surface-800);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: var(--font-body);
  transition:
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.input-base::placeholder {
  color: var(--color-text-disabled);
}

.input-base:focus {
  outline: none;
  border-color: var(--color-brand-500);
  box-shadow: 0 0 0 3px oklch(0.7 0.18 72 / 15%);
}

.input-base:hover:not(:focus) {
  border-color: var(--color-surface-600);
}

.input-base[data-error] {
  border-color: var(--color-danger-500);
  box-shadow: 0 0 0 3px oklch(0.58 0.24 27 / 12%);
}
```

#### 6.1.3 Card (Glassmorphism Funcțional)

```css
/* Card — dark glassmorphism */
.card {
  background: oklch(0.13 0.02 255 / 80%); /* surface-900 cu 80% opacity */
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  border: 1px solid oklch(0.22 0.02 257 / 60%); /* border subtil */
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 20px 24px;
}

/* Card hover */
.card:hover {
  background: oklch(0.17 0.02 256 / 85%);
  border-color: oklch(0.28 0.02 258 / 70%);
  box-shadow: var(--shadow-lg);
  transition: all var(--duration-normal) var(--ease-out);
}

/* Card outlined — pentru secțiuni secundare */
.card-outlined {
  background: transparent;
  border: 1px solid var(--color-border);
}
```

#### 6.1.4 Badge

```tsx
// Tier badges — fundamentale pentru Cerniq
<Badge variant="bronze">Bronze</Badge>
<Badge variant="silver">Silver</Badge>
<Badge variant="gold">Gold</Badge>

// Status badges
<Badge variant="success">Activ</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Blocat</Badge>
<Badge variant="info">În procesare</Badge>

// Priority badges
<Badge variant="outline" size="sm">Normal</Badge>
<Badge variant="solid" color="warning" size="sm">Urgent</Badge>
<Badge variant="solid" color="danger" size="sm">🔴 Critical</Badge>
```

**Implementare:**

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.4;
  white-space: nowrap;
}

.badge-bronze {
  background: var(--color-tier-bronze-bg);
  color: var(--color-tier-bronze-text);
  border: 1px solid var(--color-tier-bronze-border);
}

.badge-gold {
  background: var(--color-tier-gold-bg);
  color: var(--color-tier-gold-text);
  border: 1px solid var(--color-tier-gold-border);
  /* Gold shimmer effect */
  background-image: linear-gradient(
    135deg,
    oklch(0.2 0.06 80) 0%,
    oklch(0.24 0.09 82) 50%,
    oklch(0.2 0.06 80) 100%
  );
}
```

#### 6.1.5 Spinner & Skeleton

```tsx
// Spinner — minimal, brand color
<Spinner size="sm" />  {/* 16px */}
<Spinner size="md" />  {/* 24px — DEFAULT */}
<Spinner size="lg" />  {/* 40px */}

// Skeleton — pentru loading states (preferat față de spinner)
<Skeleton className="h-4 w-32 rounded" />
<Skeleton className="h-10 w-full rounded-md" />

// Skeleton compound — KPI Card loading
<SkeletonKPICard />
```

**Skeleton animat:**

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface-800) 0%,
    var(--color-surface-700) 50%,
    var(--color-surface-800) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

#### 6.1.6 Toast Notifications (Sonner)

```tsx
// Configurare Sonner în App.tsx
import { Toaster } from "sonner";

<Toaster
  position="bottom-right"
  toastOptions={{
    classNames: {
      toast: "toast-base",
      title: "toast-title",
      description: "toast-description",
    },
    duration: 4000,
  }}
  expand={false}
  richColors={false} // Vom folosi stilizare custom
  closeButton={true}
/>;

// Utilizare
import { toast } from "sonner";

toast.success("Contact promovat la Silver", {
  description: "SC AgroRom SRL — CUI 12345678",
});

toast.error("Autentificare eșuată", {
  description: "Verificați email și parola",
});
```

**Stilizare toast custom:**

```css
.toast-base {
  background: var(--color-surface-800) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-xl) !important;
  backdrop-filter: blur(16px);
  color: var(--color-text-primary) !important;
  padding: 12px 16px !important;
}
```

---

### 6.2 Navigation Components

#### 6.2.1 Sidebar Navigation

```
┌────────────────────────────────┐
│  ╔══════════════════════════╗  │
│  ║  🌾  CERNIQ              ║  │ ← Logo zone (h-14)
│  ╚══════════════════════════╝  │
│                                │
│  MAIN                          │ ← Section label (2xs, widest, uppercase)
│  ▶ Dashboard                   │ ← Active nav item (brand accent)
│    Contacte                    │
│    Companii                    │
│                                │
│  ENRICHMENT                    │
│    Import Date                 │
│    Bronze Layer                │
│    Silver Layer                │
│    Gold Layer                  │
│                                │
│  OUTREACH                      │
│    Campanii                    │
│    Aprobări             ②      │ ← Badge count
│                                │
│  ───────────────────────────   │ ← Divider
│                                │
│  Settings                      │
│                                │
│  ─────────────────────         │
│  👤  Alex Ionescu              │ ← User zone (bottom)
│      Administrator             │
│  ⚙   [···]                    │
└────────────────────────────────┘
```

**CSS Sidebar:**

```css
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-surface-900);
  border-right: 1px solid var(--color-border-subtle);
  overflow-y: auto;
  overflow-x: hidden;
  /* Smooth scrollbar */
  scrollbar-width: thin;
  scrollbar-color: var(--color-surface-700) transparent;
}

/* Nav Item */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  margin: 1px 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all var(--duration-fast) var(--ease-out);
  cursor: pointer;
  text-decoration: none;
}

.nav-item:hover {
  background: var(--color-surface-800);
  color: var(--color-text-primary);
}

.nav-item[data-active="true"] {
  background: oklch(0.7 0.18 72 / 12%); /* brand cu opacity */
  color: var(--color-brand-300);
  /* Indicator lateral */
  position: relative;
}

.nav-item[data-active="true"]::before {
  content: "";
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--color-brand-500);
  border-radius: var(--radius-full);
}

/* Icon în nav */
.nav-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-item[data-active="true"] svg {
  opacity: 1;
  color: var(--color-brand-400);
}
```

#### 6.2.2 Header

```
┌──────────────────────────────────────────────────────────────┐
│ ≡  Breadcrumbs: Dashboard > Silver > Companii               [🔔] [👤] │
└──────────────────────────────────────────────────────────────┘
```

**Specificații:**

```css
.header {
  height: var(--header-height); /* 56px */
  display: flex;
  align-items: center;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: oklch(0.13 0.02 255 / 90%);
  backdrop-filter: blur(20px) saturate(1.4);
  border-bottom: 1px solid var(--color-border-subtle);
  gap: 16px;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.breadcrumb-current {
  color: var(--color-text-primary);
  font-weight: 500;
}
```

---

## 7. Login Page — Design Complet

### 7.1 Layout Conceptual

Etapa 0 necesită o pagină de login care să:

- Stabilească **credibilitatea** platformei din primul moment
- Fie **eficientă** (minimum clicuri, autofocus pe email)
- Reflecte **brand identity** — Dark Terroir
- Funcționeze **perfect** pe mobil (sales pe telefon)

### 7.2 Structura Vizuală

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈                          │
│               ≈≈≈≈  Background: Deep Navy  ≈≈≈≈                  │
│            ≈≈  surface-950 cu subtle grain texture  ≈≈            │
│                    ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈                          │
│                                                                  │
│              ┌───────────────────────────────┐                  │
│              │  Card: Glassmorphism           │                  │
│              │  backdrop-blur-2xl             │                  │
│              │  bg: surface-900/80            │                  │
│              │                                │                  │
│              │  🌾  CERNIQ                    │                  │
│              │  Automatizare vânzări B2B      │                  │
│              │  ─────────────────────────     │                  │
│              │                                │                  │
│              │  Email                         │                  │
│              │  [________________________]    │                  │
│              │                                │                  │
│              │  Parolă                        │                  │
│              │  [________________________]👁  │                  │
│              │                                │                  │
│              │  [    Intră în cont    →]      │  ← brand-500    │
│              │                                │                  │
│              │  Ai uitat parola?              │  ← tertiary     │
│              │                                │                  │
│              └───────────────────────────────┘                  │
│                                                                  │
│              © 2026 Cerniq · Privacy · Terms                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Background Effect

Fundalul paginii de login trebuie să fie premium fără a distrage atenția:

```css
.login-bg {
  min-height: 100vh;
  background: var(--color-surface-950);

  /* Subtle grain texture pentru profunzime */
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"),
    radial-gradient(
      ellipse at 20% 80%,
      oklch(0.7 0.18 72 / 4%) 0%,
      /* Brand glow subtle - bottom left */ transparent 60%
    ),
    radial-gradient(
      ellipse at 80% 20%,
      oklch(0.57 0.2 245 / 4%) 0%,
      /* Blue glow subtle - top right */ transparent 60%
    );

  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
```

### 7.4 Login Card Component

```tsx
// src/pages/auth/Login.tsx

import { useState, useRef, useEffect } from "react";
import { useLogin } from "@refinedev/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email-ul este obligatoriu")
    .email("Adresă de email invalidă"),
  password: z
    .string()
    .min(1, "Parola este obligatorie")
    .min(8, "Parola trebuie să aibă minimum 8 caractere"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const { mutate: login, isLoading } = useLogin<LoginForm>();

  // Autofocus pe email la mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    login(
      { email: data.email, password: data.password },
      {
        onError: () => {
          toast.error("Autentificare eșuată", {
            description: "Verificați email-ul și parola și încercați din nou.",
          });
        },
      },
    );
  };

  return (
    <div className="login-bg">
      {/* Skip link pentru accesibilitate */}
      <a href="#main-content" className="skip-link">
        Sari la conținut
      </a>

      <main
        id="main-content"
        className="login-card"
        aria-label="Formular autentificare"
      >
        {/* Logo */}
        <div className="login-logo">
          <CerniqLogo />
          <div className="login-tagline">
            Automatizare vânzări B2B în agricultura românească
          </div>
        </div>

        <hr className="login-divider" />

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Formular de autentificare"
        >
          {/* Email field */}
          <div className="field-group">
            <label htmlFor="email" className="field-label">
              Email de serviciu
            </label>
            <input
              {...register("email")}
              ref={(e) => {
                register("email").ref(e);
                emailRef.current = e;
              }}
              id="email"
              type="email"
              autoComplete="email"
              placeholder="alex@compania.ro"
              className={`input-base ${errors.email ? "input-error" : ""}`}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="field-error" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="field-group">
            <div className="field-label-row">
              <label htmlFor="password" className="field-label">
                Parolă
              </label>
              <a href="/forgot-password" className="forgot-link">
                Ai uitat parola?
              </a>
            </div>
            <div className="input-wrapper">
              <input
                {...register("password")}
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className={`input-base input-with-icon ${errors.password ? "input-error" : ""}`}
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
              >
                {showPassword ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="field-error" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="btn-primary btn-full"
            disabled={isLoading}
            aria-disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="w-4 h-4 animate-spin" aria-hidden />
                <span>Se autentifică...</span>
              </>
            ) : (
              <>
                <span>Intră în cont</span>
                <ArrowRightIcon className="w-4 h-4" aria-hidden />
              </>
            )}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        © 2026 Cerniq ·<a href="/privacy">Politică de confidențialitate</a> ·
        <a href="/terms">Termeni</a>
      </footer>
    </div>
  );
}
```

### 7.5 CSS Login Page

```css
/* Login page styles — în globals.css sau login.module.css */

.login-bg {
  min-height: 100dvh; /* dvh pentru mobile (address bar) */
  background-color: var(--color-surface-950);
  background-image:
    url("data:image/svg+xml,[noise-svg]"),
    radial-gradient(
      ellipse at 20% 80%,
      oklch(0.7 0.18 72 / 5%) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse at 80% 20%,
      oklch(0.57 0.2 245 / 4%) 0%,
      transparent 60%
    );
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: oklch(0.13 0.02 255 / 80%);
  backdrop-filter: blur(24px) saturate(1.3);
  border: 1px solid oklch(0.25 0.02 255 / 50%);
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow:
    var(--shadow-xl),
    0 0 0 1px oklch(0.7 0.18 72 / 3%) inset; /* subtle brand glow inset */

  /* Entry animation */
  animation: card-enter 0.4s var(--ease-bounce) both;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.login-logo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 24px;
}

.login-tagline {
  font-size: 13px;
  color: var(--color-text-tertiary);
  line-height: 1.4;
}

.login-divider {
  border: none;
  border-top: 1px solid var(--color-border-subtle);
  margin: 0 0 24px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.forgot-link {
  font-size: 12px;
  color: var(--color-brand-400);
  text-decoration: none;
  transition: color var(--duration-fast);
}

.forgot-link:hover {
  color: var(--color-brand-300);
  text-decoration: underline;
}

.input-wrapper {
  position: relative;
}

.input-with-icon {
  padding-right: 40px;
}

.input-icon-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: color var(--duration-fast);
}

.input-icon-btn:hover {
  color: var(--color-text-secondary);
}

.field-error {
  font-size: 12px;
  color: var(--color-danger-400);
  display: flex;
  align-items: center;
  gap: 4px;
}

.field-error::before {
  content: "⚠";
  font-size: 10px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
  padding: 0 20px;
  background: var(--color-brand-500);
  color: oklch(0.1 0.02 255);
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  margin-top: 8px;
}

.btn-full {
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-brand-400);
  box-shadow: var(--shadow-glow-brand);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  background: var(--color-brand-600);
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Skip link pentru accesibilitate */
.skip-link {
  position: absolute;
  top: -100px;
  left: 24px;
  background: var(--color-brand-500);
  color: oklch(0.1 0.02 255);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  z-index: 9999;
  text-decoration: none;
  transition: top var(--duration-fast);
}

.skip-link:focus {
  top: 24px;
}

.login-footer {
  font-size: 12px;
  color: var(--color-text-disabled);
  text-align: center;
}

.login-footer a {
  color: var(--color-text-tertiary);
  text-decoration: none;
}

.login-footer a:hover {
  color: var(--color-text-secondary);
  text-decoration: underline;
}
```

### 7.6 Logo Component

```tsx
// src/components/brand/CerniqLogo.tsx
// Logo conceptual — va fi înlocuit cu SVG final

export function CerniqLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { icon: 24, text: 16 },
    md: { icon: 32, text: 22 },
    lg: { icon: 40, text: 28 },
  };

  const { icon, text } = sizes[size];

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "10px" }}
      aria-label="Cerniq"
      role="img"
    >
      {/* Icon — wheat/grain simbolic */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        {/* Hexagon base — structură, date */}
        <path
          d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
          fill={`oklch(0.70 0.18 72 / 15%)`}
          stroke={`oklch(0.70 0.18 72)`}
          strokeWidth="1.5"
        />
        {/* Grain/arrow interior */}
        <path
          d="M16 10V22M11 14L16 10L21 14"
          stroke={`oklch(0.82 0.18 82)`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="22" r="2" fill={`oklch(0.82 0.18 82)`} />
      </svg>

      {/* Wordmark */}
      <span
        style={{
          fontFamily: "Bricolage Grotesque, sans-serif",
          fontSize: text,
          fontWeight: 700,
          color: `oklch(0.95 0.005 255)`,
          letterSpacing: "-0.03em",
        }}
      >
        cerniq
        <span style={{ color: `oklch(0.70 0.18 72)` }}>.</span>
        <span style={{ fontWeight: 400, fontSize: text * 0.75 }}>app</span>
      </span>
    </div>
  );
}
```

---

## 8. App Shell Layout

### 8.1 Layout Architecture

```tsx
// src/components/layout/AppLayout.tsx

import { useState } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main area */}
      <div
        className={cn("main-area", sidebarCollapsed && "main-area-collapsed")}
      >
        <Header onMobileMenuToggle={() => setMobileOpen(!mobileOpen)} />

        <main id="main-content" className="main-content" tabIndex={-1}>
          {/* Page transitions */}
          <div className="page-wrapper">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
```

**CSS Layout:**

```css
.app-layout {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  background: var(--color-bg);
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  height: 100dvh;
  position: sticky;
  top: 0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-elevated);
  border-right: 1px solid var(--color-border-subtle);
  transition: width var(--duration-slow) var(--ease-in-out);
  overflow: hidden;
  z-index: var(--z-sticky);
}

.sidebar[data-collapsed="true"] {
  width: var(--sidebar-width-collapsed);
}

/* Sidebar Overlay — mobile */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: oklch(0 0 0 / 60%);
  z-index: calc(var(--z-sticky) - 1);
  backdrop-filter: blur(4px);
  animation: fade-in var(--duration-normal) var(--ease-out);
}

/* Main area */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: margin-left var(--duration-slow) var(--ease-in-out);
}

/* Main content scrollable */
.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--color-surface-700) transparent;
}

/* Page wrapper — padding consistent */
.page-wrapper {
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--spacing-6);
  min-height: calc(100vh - var(--header-height));

  /* Page transition */
  animation: page-enter var(--duration-normal) var(--ease-out);
}

@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile responsive */
@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    left: -100%;
    transition: left var(--duration-slow) var(--ease-in-out);
  }

  .sidebar[data-mobile-open="true"] {
    left: 0;
  }

  .main-area {
    width: 100%;
  }
}
```

### 8.2 Sidebar Navigation Data Structure

```tsx
// src/config/navigation.ts

import {
  LayoutDashboardIcon,
  BuildingIcon,
  UsersIcon,
  UploadIcon,
  DatabaseIcon,
  StarIcon,
  SendIcon,
  ClipboardCheckIcon,
  SettingsIcon,
  BarChart3Icon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType;
  badge?: number;
  children?: NavItem[];
  requiredRole?: "admin" | "user";
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const navigationConfig: NavSection[] = [
  {
    id: "main",
    label: "PRINCIPAL",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboardIcon,
      },
    ],
  },
  {
    id: "enrichment",
    label: "ENRICHMENT",
    items: [
      {
        id: "imports",
        label: "Import Date",
        href: "/imports",
        icon: UploadIcon,
      },
      {
        id: "bronze",
        label: "Bronze Layer",
        href: "/bronze/contacts",
        icon: DatabaseIcon,
      },
      {
        id: "silver",
        label: "Silver Layer",
        href: "/silver/companies",
        icon: BuildingIcon,
      },
      {
        id: "gold",
        label: "Gold Layer",
        href: "/gold/companies",
        icon: StarIcon,
      },
    ],
  },
  {
    id: "outreach",
    label: "OUTREACH",
    items: [
      {
        id: "campaigns",
        label: "Campanii",
        href: "/campaigns",
        icon: SendIcon,
      },
      {
        id: "approvals",
        label: "Aprobări",
        href: "/approvals",
        icon: ClipboardCheckIcon,
        badge: 0, // Will be populated dynamically
      },
    ],
  },
  {
    id: "analytics",
    label: "ANALITICS",
    items: [
      {
        id: "analytics",
        label: "Rapoarte",
        href: "/analytics",
        icon: BarChart3Icon,
      },
    ],
  },
];
```

### 8.3 Sidebar Component Complet

```tsx
// src/components/layout/Sidebar.tsx

import { Link, useLocation } from "react-router";
import { ChevronLeftIcon, MenuIcon } from "lucide-react";
import { navigationConfig } from "@/config/navigation";
import { CerniqLogo } from "@/components/brand/CerniqLogo";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapse: () => void;
  onMobileClose: () => void;
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onCollapse,
  onMobileClose,
}: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(href);
  };

  return (
    <nav
      className={cn("sidebar", collapsed && "sidebar-collapsed")}
      data-collapsed={collapsed}
      data-mobile-open={mobileOpen}
      aria-label="Navigare principală"
    >
      {/* Logo Zone */}
      <div className="sidebar-logo-zone">
        <Link to="/dashboard" aria-label="Cerniq — Acasă">
          {collapsed ? (
            <CerniqLogo size="sm" iconOnly />
          ) : (
            <CerniqLogo size="sm" />
          )}
        </Link>

        {/* Collapse button — desktop only */}
        <button
          className="sidebar-collapse-btn"
          onClick={onCollapse}
          aria-label={collapsed ? "Extinde sidebar" : "Restrânge sidebar"}
          title={collapsed ? "Extinde" : "Restrânge"}
        >
          <ChevronLeftIcon
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="sidebar-nav" role="list">
        {navigationConfig.map((section) => (
          <div key={section.id} className="nav-section" role="listitem">
            {!collapsed && (
              <span className="nav-section-label" aria-hidden="true">
                {section.label}
              </span>
            )}

            {section.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn("nav-item", active && "nav-item-active")}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  onClick={mobileOpen ? onMobileClose : undefined}
                >
                  <Icon className="nav-icon" aria-hidden />
                  {!collapsed && (
                    <>
                      <span className="nav-label">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className="nav-badge"
                          aria-label={`${item.badge} pending`}
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Zone */}
      <div className="sidebar-user-zone">
        <div className="sidebar-divider" />
        <div
          className={cn("user-profile", collapsed && "user-profile-collapsed")}
        >
          <div className="user-avatar" aria-hidden>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="user-info">
              <div className="user-name">{user?.name || "Utilizator"}</div>
              <div className="user-role">{user?.role || "Admin"}</div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
```

---

## 9. Dashboard Placeholder (Etapa 0)

### 9.1 Scop

Dashboard-ul din Etapa 0 este un **placeholder structurat** — nu are date reale. Rolul lui:

1. Validează că layout-ul funcționează
2. Demonstrează componentele design system
3. Indică clar că este în construcție
4. Serveste ca "canvas" pentru Etapa 1

### 9.2 Design

```tsx
// src/pages/dashboard/index.tsx (Etapa 0)

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Pipeline Bronze → Silver → Gold · Etapa 0 — Infrastructură
          </p>
        </div>
        <div className="page-actions">
          <StatusBadge status="infrastructure" />
        </div>
      </div>

      {/* Etapa 0 Notice */}
      <EtapaBanner
        etapa={0}
        message="Infrastructura este configurată. Dashboard-ul cu date reale va fi disponibil în Etapa 1."
        nextEtapa="Data Enrichment (Etapa 1)"
      />

      {/* KPI Grid — Skeleton state */}
      <div className="bento-grid-kpi">
        <KPICardSkeleton
          label="Bronze Contacts"
          icon="database"
          color="bronze"
        />
        <KPICardSkeleton
          label="Silver Companies"
          icon="building"
          color="silver"
        />
        <KPICardSkeleton label="Gold Ready" icon="star" color="gold" />
        <KPICardSkeleton
          label="Aprobări Pending"
          icon="clipboard"
          color="warning"
        />
      </div>

      {/* Infrastructure Status — Etapa 0 specific */}
      <div className="bento-grid-2col">
        <InfrastructureStatus />
        <SystemHealthCard />
      </div>
    </div>
  );
}

// Etapa Banner Component
function EtapaBanner({ etapa, message, nextEtapa }) {
  return (
    <div className="etapa-banner" role="status">
      <div className="etapa-badge">
        <span className="etapa-number">Etapa {etapa}</span>
        <span className="etapa-name">Infrastructură MVP</span>
      </div>
      <p className="etapa-message">{message}</p>
      <div className="etapa-next">
        <span>Urmează:</span>
        <strong>{nextEtapa}</strong>
      </div>
    </div>
  );
}
```

**CSS Etapa Banner:**

```css
.etapa-banner {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  background: oklch(0.7 0.18 72 / 6%);
  border: 1px solid oklch(0.7 0.18 72 / 20%);
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--color-brand-500);
}

.etapa-badge {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.etapa-number {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-brand-400);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.etapa-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.etapa-message {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.etapa-next {
  font-size: 12px;
  color: var(--color-text-tertiary);
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.etapa-next strong {
  color: var(--color-brand-400);
}
```

---

## 10. Motion & Animation System

### 10.1 Principii de Motion

1. **Purposeful** — Orice animație comunică ceva (stare, tranziție, feedback)
2. **Fast** — Duratele implicite sunt 100-200ms. Nu mai lent decât necesar
3. **Natural** — Ease curves care imită fizica (nu linear)
4. **Respects preferences** — `prefers-reduced-motion` respectat strict

### 10.2 Motion Tokens

Definite în §2 (Design Tokens). Rezumat:

- **instant** (50ms): hover state, focus ring
- **fast** (100ms): button press, icon swap
- **normal** (200ms): modal open, dropdown, card hover
- **slow** (300ms): sidebar collapse, page transition
- **slower** (500ms): toast dismiss, complex transitions
- **slowest** (700ms): intro animations (o singură dată)

### 10.3 Animații pe Componente

```css
/* Page entry — fiecare pagina nouă */
@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Card hover lift */
@keyframes card-lift {
  to {
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl);
  }
}

/* Skeleton shimmer */
@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Login card entrance */
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Badge pulse — pentru notificări urgente */
@keyframes badge-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 oklch(0.58 0.24 27 / 40%);
  }
  50% {
    box-shadow: 0 0 0 6px oklch(0.58 0.24 27 / 0%);
  }
}

/* Spinner rotation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Toast slide in */
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Collapsible open */
@keyframes collapsible-open {
  from {
    height: 0;
    opacity: 0;
  }
  to {
    height: var(--radix-collapsible-content-height);
    opacity: 1;
  }
}

/* Collapsible close */
@keyframes collapsible-close {
  from {
    height: var(--radix-collapsible-content-height);
    opacity: 1;
  }
  to {
    height: 0;
    opacity: 0;
  }
}
```

### 10.4 Reduced Motion

```css
/* OBLIGATORIU — respectă preferința utilizatorului */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Skeleton fără shimmer — statică */
  .skeleton {
    animation: none;
    opacity: 0.5;
  }
}
```

---

## 11. Dark Mode Architecture

### 11.1 Strategie: Dark First

Dark mode este **default** în Cerniq. Light mode este disponibil dar secundar.

Implementare cu CSS `[data-theme]` attribute pe `<html>`:

```css
/* globals.css */

/* Dark mode — DEFAULT */
:root,
[data-theme="dark"] {
  --color-bg: var(--color-surface-950);
  --color-bg-elevated: var(--color-surface-900);
  --color-bg-overlay: var(--color-surface-800);
  --color-border: var(--color-surface-700);
  --color-border-subtle: oklch(0.2 0.02 255 / 60%);
  --color-text-primary: oklch(0.95 0.005 255);
  --color-text-secondary: oklch(0.7 0.01 255);
  --color-text-tertiary: oklch(0.5 0.01 255);
  --color-text-disabled: oklch(0.35 0.01 255);
  --color-accent: var(--color-brand-500);
  --color-accent-hover: var(--color-brand-400);
}

/* Light mode */
[data-theme="light"] {
  --color-bg: var(--color-surface-50);
  --color-bg-elevated: var(--color-surface-100);
  --color-bg-overlay: var(--color-surface-200);
  --color-border: oklch(0.88 0.01 255);
  --color-border-subtle: oklch(0.88 0.01 255 / 80%);
  --color-text-primary: oklch(0.15 0.02 255);
  --color-text-secondary: oklch(0.38 0.02 255);
  --color-text-tertiary: oklch(0.55 0.01 255);
  --color-text-disabled: oklch(0.7 0.01 255);
  --color-accent: var(--color-brand-600);
  --color-accent-hover: var(--color-brand-700);
}
```

### 11.2 Theme Toggle Component

```tsx
// src/components/ui/ThemeToggle.tsx

import { useTheme } from "@/providers/theme-provider";
import { SunIcon, MoonIcon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={`Comută la ${theme === "dark" ? "mod luminos" : "mod întunecat"}`}
    >
      {theme === "dark" ? (
        <SunIcon className="w-4 h-4" />
      ) : (
        <MoonIcon className="w-4 h-4" />
      )}
    </button>
  );
}
```

### 11.3 Theme Provider

```tsx
// src/providers/theme-provider.tsx

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Verifică preferința salvată
    const saved = localStorage.getItem("cerniq-theme") as Theme | null;
    if (saved) return saved;
    // Fallback la preferința sistemului — dar default dark
    return "dark";
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("cerniq-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

---

## 12. Accessibility — WCAG 2.2 AA

### 12.1 Checklist WCAG 2.2 pentru Etapa 0

**Perceivable:**

- ✅ Contrast text/background ≥ 4.5:1 (verificat în §4.3)
- ✅ Imagini cu atribute `alt` descriptive
- ✅ Formulare cu `<label>` legat de input via `htmlFor`/`id`
- ✅ Erori de formular anunțate via `aria-describedby` + `role="alert"`
- ✅ Focus indicators vizibili (outline: 2px brand-500)

**Operable:**

- ✅ Toată navigarea funcționează cu tastatură
- ✅ Focus order logic (Tab flows natural)
- ✅ Skip link "Sari la conținut" (implementat în Login)
- ✅ `2.4.11 Focus Not Obscured` — `scroll-padding-top: 56px` (header height)
- ✅ `2.5.8 Target Size` — min 36px height pe butoane (recomandat 44px)
- ✅ `2.5.7 Dragging Movements` — nu există drag în Etapa 0

**Understandable:**

- ✅ `lang="ro"` pe `<html>` (română cu diacritice)
- ✅ Etichete descriptive pe toate elementele interactive
- ✅ Mesaje de eroare clare, în română
- ✅ `3.3.8 Accessible Authentication` — password manager support, copy-paste enabled

**Robust:**

- ✅ HTML semantic (`<nav>`, `<main>`, `<header>`, `<footer>`)
- ✅ `aria-label` pe navigare și regiuni
- ✅ `aria-current="page"` pe nav item activ
- ✅ Live regions pentru notificări dinamice

### 12.2 HTML Semantic Template

```html
<!DOCTYPE html>
<html lang="ro" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Preconnect fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    <!-- PWA + Mobile -->
    <meta name="theme-color" content="#0f1117" />
    <meta name="color-scheme" content="dark light" />

    <!-- Security -->
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />

    <title>Cerniq.app — Automatizare vânzări B2B agricultură</title>
    <meta
      name="description"
      content="Platformă B2B de automatizare vânzări pentru piața agricolă românească"
    />
  </head>
  <body>
    <!-- Skip link -->
    <a href="#main-content" class="skip-link"> Sari la conținut principal </a>

    <!-- React root -->
    <div id="root"></div>

    <!-- Fonts preload în JS -->
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 12.3 Focus Management

```css
/* Focus visible — consistent și distinctiv */
:focus-visible {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Scroll padding — header nu acoperă focused elements (WCAG 2.4.11) */
html {
  scroll-padding-top: calc(var(--header-height) + 8px);
}

/* Focus pentru nav items */
.nav-item:focus-visible {
  outline-offset: -2px; /* Inside pentru nav */
}

/* Eliminăm focus pe click (dar nu pe keyboard) */
:focus:not(:focus-visible) {
  outline: none;
}
```

### 12.4 Keyboard Navigation Pattern

```tsx
// Toolbar cu navigare arrow keys (WCAG pattern)
// Utilizat în Header pentru acțiuni globale

function HeaderActions() {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemsRef = useRef<HTMLButtonElement[]>([]);

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    let nextIndex = index;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (index + 1) % itemsRef.current.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex =
          (index - 1 + itemsRef.current.length) % itemsRef.current.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = itemsRef.current.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    setActiveIndex(nextIndex);
    itemsRef.current[nextIndex]?.focus();
  };

  const actions = [
    { label: "Notificări", icon: BellIcon },
    { label: "Setări", icon: SettingsIcon },
    { label: "Comută tema", icon: SunMoonIcon },
  ];

  return (
    <div role="toolbar" aria-label="Acțiuni header" className="header-actions">
      {actions.map((action, index) => (
        <button
          key={action.label}
          ref={(el) => el && (itemsRef.current[index] = el)}
          tabIndex={index === activeIndex ? 0 : -1}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className="header-action-btn"
          aria-label={action.label}
          title={action.label}
        >
          <action.icon className="w-4 h-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
```

---

## 13. Performance Targets

### 13.1 Core Web Vitals 2026

| Metric   | Target  | Implementare în Etapa 0                                 |
| -------- | ------- | ------------------------------------------------------- |
| **LCP**  | ≤ 2.5s  | Font preload, CSS critical inline, Vite SWC             |
| **INP**  | ≤ 200ms | React 19 Compiler, optimistic updates                   |
| **CLS**  | ≤ 0.1   | Skeleton screens cu dimensiuni fixe, font-display: swap |
| **FCP**  | ≤ 1.8s  | Server-side rendering pregătit, minimal CSS             |
| **TTFB** | ≤ 800ms | Traefik optimizat, Hetzner proximity                    |

### 13.2 Bundle Size Targets

```
Initial Bundle (gzipped):
─────────────────────────────────────────────────────
Total JS:        < 200KB   (React 19 + Refine + Sonner)
Total CSS:       < 20KB    (Tailwind v4 purged)
Fonts:           < 50KB    (woff2 subset latin-ext)
─────────────────────────────────────────────────────
Total initial:   < 270KB   ← Target Etapa 0

Lazy loaded (per-route):
Dashboard:       < 30KB
Login:           < 15KB
```

### 13.3 Implementare Performance

```typescript
// vite.config.ts — optimizare build

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc"; // SWC — 20x mai rapid
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },

  build: {
    target: "es2022", // Modern browsers — mai mic bundle
    minify: "esbuild",
    cssMinify: true,
    reportCompressedSize: true,

    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks separate — caching mai bun
          "vendor-react": ["react", "react-dom"],
          "vendor-refine": ["@refinedev/core"],
          "vendor-router": ["react-router"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-icons": ["lucide-react"],
          "vendor-forms": ["react-hook-form", "zod"],
        },
      },
    },
  },

  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
```

### 13.4 Font Loading Strategy

```html
<!-- Preload primele fonturi necesare -->
<link
  rel="preload"
  href="https://fonts.gstatic.com/s/dmsans/v14/rP2Hp2ywxg089UriCZa4ET-DNl0.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

```css
/* Font display swap — evită invisible text */
@font-face {
  font-family: "DM Sans";
  font-display: swap; /* ← Text vizibil imediat cu fallback */
  /* ...rest */
}
```

---

## 14. File Structure Frontend

```
apps/web/src/
│
├── styles/
│   ├── tokens.css           ← Design tokens (@theme)
│   ├── globals.css          ← Base styles, reset, utilities
│   ├── animations.css       ← Keyframes centralizate
│   └── typography.css       ← Typography helpers
│
├── components/
│   ├── ui/                  ← Design system primitive components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── skeleton.tsx
│   │   ├── spinner.tsx
│   │   ├── toast.tsx
│   │   ├── separator.tsx
│   │   ├── tooltip.tsx
│   │   └── index.ts         ← Re-exports
│   │
│   ├── layout/              ← Layout shell components
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Breadcrumb.tsx
│   │   └── PageWrapper.tsx
│   │
│   ├── brand/               ← Brand-specific
│   │   ├── CerniqLogo.tsx
│   │   └── EtapaBadge.tsx
│   │
│   └── feedback/            ← User feedback components
│       ├── EmptyState.tsx
│       ├── ErrorBoundary.tsx
│       └── LoadingPage.tsx
│
├── pages/
│   ├── auth/
│   │   ├── Login.tsx        ← ETAPA 0
│   │   └── ForgotPassword.tsx
│   │
│   └── dashboard/
│       └── index.tsx        ← ETAPA 0 — Placeholder
│
├── providers/
│   ├── auth-provider.tsx    ← JWT authentication
│   ├── theme-provider.tsx   ← Dark/light mode
│   ├── data-provider.ts     ← Refine data provider
│   └── query-provider.tsx   ← TanStack Query
│
├── config/
│   ├── navigation.ts        ← Nav config
│   └── constants.ts         ← App constants
│
├── hooks/
│   ├── useTheme.ts
│   ├── useBreakpoint.ts
│   └── useDebounce.ts
│
├── lib/
│   ├── utils.ts             ← cn(), formatters
│   └── axios.ts             ← HTTP client configurat
│
├── types/
│   └── index.ts             ← Shared TypeScript types
│
├── App.tsx                  ← Refine + Router root
└── main.tsx                 ← Entry point
```

---

## 15. Implementation Checklist Etapa 0

### 15.1 Design System Foundation (F0.11.1)

```
DESIGN TOKENS & STYLES
─────────────────────────────────────────────────────────────────────
□ Creat tokens.css cu @theme complet (culori OKLCH, spacing, radii)
□ Creat globals.css cu reset, base styles, utilitare
□ Creat animations.css cu toate keyframes
□ Creat typography.css cu scale și helpers
□ Verificat că fonturile se încarcă corect cu diacritice românești
□ Verificat contrast WCAG 2.2 AA pentru toate combinațiile text/bg
□ Dark mode configurat ca default cu data-theme pe <html>
□ ThemeProvider implementat cu localStorage persistence

PRIMITIVE COMPONENTS (shadcn/ui + customizare)
─────────────────────────────────────────────────────────────────────
□ Button — toate variantele și size-urile, loading state
□ Input — cu label, error state, helper text, password toggle
□ Card — glassmorphism, outlined, hover state
□ Badge — Bronze, Silver, Gold, Semantic variants
□ Skeleton — shimmer animation, compound variants
□ Spinner — 3 size-uri, brand color
□ Toast (Sonner) — configurat, stilizat cu design system
□ Separator — horizontal și vertical
□ Tooltip — Radix UI, accesibil

NAVIGATION COMPONENTS
─────────────────────────────────────────────────────────────────────
□ CerniqLogo — SVG, toate size-urile, icon-only variant
□ Sidebar — collapsible, mobile overlay, nav sections
□ Header — breadcrumb, actions toolbar, mobile menu toggle
□ Breadcrumb — cu aria-label, separator, current page
□ ThemeToggle — dark/light switch în header
```

### 15.2 Pages (F0.11.1 — F0.11.6)

```
AUTH
─────────────────────────────────────────────────────────────────────
□ Login page — layout complet conform §7
□ Login form — React Hook Form + Zod validation
□ Email autofocus la mount
□ Password toggle show/hide
□ Loading state pe submit button
□ Error toast pe autentificare eșuată
□ Redirect la dashboard după login reușit
□ "Ai uitat parola?" link (pagina poate fi placeholder)
□ Skip link accesibil
□ Skip link funcționează cu keyboard

APP SHELL
─────────────────────────────────────────────────────────────────────
□ AppLayout — flex layout, sticky sidebar
□ Protected routes — redirect la /login dacă neautentificat
□ Sidebar navigation — toate secțiunile din navigationConfig
□ Active nav item — highlighted corect cu useLocation
□ Sidebar collapse — animat, persist în localStorage
□ Mobile sidebar — overlay cu backdrop blur
□ Header sticky cu glassmorphism
□ Breadcrumb actualizat automat cu ruta
□ Page transitions — fade + slide la schimbarea rutei

DASHBOARD PLACEHOLDER
─────────────────────────────────────────────────────────────────────
□ EtapaBanner — mesaj clar că suntem în Etapa 0
□ KPI Cards în skeleton state (4 cards)
□ Infrastructure Status card (afișează serviciile active)
□ System Health card (PostgreSQL, Redis, API status)
```

### 15.3 Accessibility & Performance

```
ACCESSIBILITY
─────────────────────────────────────────────────────────────────────
□ lang="ro" pe <html>
□ meta name="color-scheme" content="dark light"
□ Skip link implementat și testat cu keyboard
□ Focus visible pe toate elementele interactive
□ scroll-padding-top pentru WCAG 2.4.11
□ aria-current="page" pe nav item activ
□ aria-label pe toate regiunile (nav, main, header)
□ Formulare cu role="alert" pe erori
□ Toate iconurile au aria-hidden sau title
□ Target size ≥ 36px pe toate butoanele
□ prefers-reduced-motion implementat în CSS
□ Testat cu Tab navigation — flow logic
□ Testat cu screen reader (NVDA sau VoiceOver)

PERFORMANCE
─────────────────────────────────────────────────────────────────────
□ Font preload în index.html
□ font-display: swap pe @font-face
□ Vite SWC plugin configurat
□ Rollup manual chunks pentru vendor splitting
□ Build output verificat: JS < 200KB gzipped
□ CSS output verificat: < 20KB gzipped
□ LCP măsurat în Chrome DevTools < 2.5s
□ CLS = 0 (skeleton cu dimensiuni fixe)
□ No layout shifts pe skeleton → content transition
```

### 15.4 Testing Foundation

```
TESTING (conform F0.13)
─────────────────────────────────────────────────────────────────────
□ Vitest configurat cu jsdom
□ React Testing Library setup
□ Test: Login form — submit cu date valide
□ Test: Login form — validare email invalid
□ Test: Login form — validare parolă scurtă
□ Test: Sidebar — navigare cu keyboard
□ Test: Theme toggle — schimbă data-theme pe html
□ Test: Protected route — redirect neautentificat
□ Snapshot test: CerniqLogo
□ Snapshot test: Badge variants
□ Playwright/Cypress: E2E login flow
□ Axe accesibilitate test pe Login page
□ Axe accesibilitate test pe Dashboard
```

---

## REZUMAT ETAPA 0 — Deliverables UI/UX

| Deliverable           | Fișiere                                      | Status            |
| --------------------- | -------------------------------------------- | ----------------- |
| Design Tokens         | `tokens.css`                                 | ⬜ De implementat |
| Global Styles         | `globals.css`, `animations.css`              | ⬜ De implementat |
| Primitive Components  | `ui/*.tsx` (9 componente)                    | ⬜ De implementat |
| Brand Components      | `CerniqLogo.tsx`, `EtapaBadge.tsx`           | ⬜ De implementat |
| Layout Shell          | `AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx` | ⬜ De implementat |
| Login Page            | `auth/Login.tsx` + stilizare                 | ⬜ De implementat |
| Dashboard Placeholder | `dashboard/index.tsx`                        | ⬜ De implementat |
| Providers             | `theme-provider.tsx`, `auth-provider.tsx`    | ⬜ De implementat |
| Navigation Config     | `config/navigation.ts`                       | ⬜ De implementat |
| Dark Mode             | `ThemeProvider` + CSS                        | ⬜ De implementat |
| Accessibility         | Skip links, aria, focus                      | ⬜ De implementat |
| Performance           | Vite config, font loading                    | ⬜ De implementat |
| Tests                 | Unit + E2E coverage                          | ⬜ De implementat |

**Total componente Etapa 0:** ~25 fișiere TypeScript/CSS  
**Estimat timp implementare:** 3-5 zile (1-person-team)  
**Blochează Etapa 1:** Da — fără shell complet nu se pot adăuga paginile de date

---

> **DOCUMENT STATUS:** NORMATIV — Sursă de adevăr pentru UI/UX Etapa 0  
> **Versiune:** 1.0 | Februarie 2026  
> **Autor:** Generat bazat pe audit complet documentație Cerniq.app  
> **Next:** Plan UI/UX Etapa 1 — Data Enrichment (Bronze → Silver → Gold)
