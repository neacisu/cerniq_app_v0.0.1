# Frontend Tech Stack

**Status:** CANONIC (Ianuarie 2026)  
**Sursă Adevăr:** Master Spec v1.2

Cerniq.app folosește un stack modern de React 19, optimizat pentru performanță și dezvoltare rapidă a interfețelor B2B complexe.

## 1. Core Frameworks

### React 19.2.3

- **Utilizare:** Server Components, Actions, noi hooks (`useActionState`, `useOptimistic`).
- **Compiler:** React Compiler (auto-memoization).
- **Strictețe:** Strict Mode activat.

### Refine v5 (Headless)

- **Rol:** Admin Framework pentru operațiuni CRUD rapide.
- **Provideri:**
  - `dataProvider`: Custom REST pentru API-ul Fastify.
  - `authProvider`: JWT Auth.
  - `notificationProvider`: UI feedback.

### TypeScript 5.x

- **Config:** `tsconfig.json` strict.
- **Tipare:** Zod schemas partajate cu backend-ul (`@cerniq/shared`).

## 2. Styling System

### Tailwind CSS v4.1+ (Oxide Engine)

- **Performanță:** Compilare Rust instantanee.
- **Config:** Zero-config detection, definește tema în CSS nativ variables.
- **Prefix:** `cq-` (opțional, pentru evitare conflicte).

### Shadcn/UI

- **Componente:** Radix UI primitives pre-styled cu Tailwind.
- **Locație:** `apps/web-admin/src/components/ui`.
- **Customizare:** Direct în cod (Copy-paste architecture).

## 3. State Management

- **Server State:** TanStack Query v5 (integrat în Refine).
- **Client State:** React Context / Zustand (minimal).
- **Forms:** React Hook Form + Zod Resolver.

## 4. Build Tools

- **Vite 6**: Dev server și bundler.
- **Birome**: Linting și Formatting (înlocuiește ESLint/Prettier în viitor, momentan ESLint 9).
