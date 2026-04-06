# CERNIQ.APP — UI/UX Documentation

## Overview

Documentația UI/UX pentru platforma Cerniq.app, aliniată cu Design System **Dark Terroir**.

---

## Stack Tehnologic

| Categorie      | Tehnologie                     |
| -------------- | ------------------------------ |
| **Framework**  | React 19                       |
| **Build**      | Vite 7.3.1                     |
| **Styling**    | Tailwind CSS v4 (Oxide engine) |
| **Admin**      | Refine v5 (headless)           |
| **Components** | shadcn/ui + Lucide React       |

---

## Design System: Dark Terroir

- **Culori:** OKLCH P3 wide-gamut — paletă amber/gold (brand) + deep navy (surface)
- **Estetică:** Glassmorphism, dark mode default
- **Tipografie:** Bricolage Grotesque (display), DM Sans (body), Geist Mono (monospace)

---

## Referințe

| Document | Descriere |
| -------- | --------- |
| [`docs/specifications/Etapa 0/etapa0-Ui_ux etapa0 plan complet.MD`](../specifications/Etapa%200/etapa0-Ui_ux%20etapa0%20plan%20complet.MD) | Specificație normativă completă (2698 linii) |
| [`docs/specifications/Etapa 0/UI_UX_Example/`](../specifications/Etapa%200/UI_UX_Example/) | Exemplu vizual și mock-up (**în afara** `apps/web` / prod până la promovare explicită — vezi [`CONTRIBUTING.md`](../../CONTRIBUTING.md)) |

---

## Fișiere din această secțiune

| Fișier                                     | Conținut                                                          |
| ------------------------------------------ | ----------------------------------------------------------------- |
| [frontend-stack.md](./frontend-stack.md)   | Stack detaliat: Vite, React, Tailwind, Refine, shadcn/ui, fonturi |
| [design-tokens.md](./design-tokens.md)     | Tokenuri de design OKLCH P3, spacing, shadows, z-index            |
| [components-list.md](./components-list.md) | Lista completă componente (primitive, layout, pagini, iconuri)    |
