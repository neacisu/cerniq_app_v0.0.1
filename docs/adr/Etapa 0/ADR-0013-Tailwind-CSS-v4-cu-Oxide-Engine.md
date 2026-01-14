# ADR-0013: Tailwind CSS v4 cu Oxide Engine

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Necesităm un framework CSS utility-first cu:

- Build-uri rapide
- Design tokens consistente
- Dark mode support
- Integration cu shadcn/ui

## Decizie

Utilizăm **Tailwind CSS v4.1** cu **Oxide engine** (Rust).

## Consecințe

### Pozitive

- **3.5-5x faster builds** cu Oxide engine
- CSS-first configuration (nu mai e nevoie de JS config)
- Container queries native
- Design tokens cu `@theme`

### Configurație

```css
/* app.css */
@import "tailwindcss";

@theme {
  --color-primary: #0066CC;
  --color-secondary: #6B7280;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-surface: #F9FAFB;
  --color-surface-dark: #111827;
  
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```
