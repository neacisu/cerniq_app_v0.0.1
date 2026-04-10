# Dark Terroir — ghid design system (Cerniq Web)

Acest document descrie token-urile CSS OKLCH (inclusiv gamut P3 acolo unde e relevant), ierarhia tipografică, spațierea și recomandări de accesibilitate. Sursa de adevăr pentru valori: `apps/web/src/styles/tokens.css` (bloc `@theme`), importat prin `globals.css`.

## Token reference (rezumat)

| Categorie | Variabile cheie |
| --------- | --------------- |
| Brand | `--color-b3` … `--color-b6` |
| Suprafețe | `--color-s950` … `--color-s600`, `--color-surface-base`, `--color-surface-raised`, `--color-surface-overlay` |
| Text | `--color-t1` … `--color-t4` |
| Semantic | `--color-ok`, `--color-wa`, `--color-er`, `--color-in` |
| Acțiune / focus | `--color-primary`, `--color-primary-hover`, `--color-focus-ring` |
| Borduri | `--color-border-subtle`, `--color-border-default` |
| Grafice | `--color-chart-1` … `--color-chart-8` |
| Tier / cognitive | `--color-tier-*`, `--color-neuron-*`, `--color-synapse-*` (vezi `tokens.css`) |
| Tipografie | `--font-display`, `--font-body`, `--font-mono` |
| Spațiere | `--space-xs` … `--space-2xl` |
| Raze | `--radius-sm` … `--radius-full` |
| Umbre | `--shadow-sm` … `--shadow-glow` |
| Stratificare | `--z-dropdown` … `--z-tooltip` |

Pentru lista exhaustivă, folosiți pagina de preview în dev: `/settings/design-system`.

## Utilizare în componente

- Preferă clase utilitare care mapează la token-uri (ex. `text-t1`, `bg-s900`) sau `var(--color-*)` în `style` când e necesar.
- Nu introduceți culori hex/rgb ad-hoc în `components/ui/`; extindeți `tokens.css` dacă lipsește un semantic.
- Butoane și linkuri: contrast minim față de fundal conform WCAG 2.1 AA (text normal ≥ 4.5:1). Pe fundal `--color-s950` / `--color-s900`, `--color-t1` / `--color-t2` sunt destinate pentru citire principală.

## Spațiere și grid

- Ritm vertical: multipli de `--space-sm` / `--space-md`.
- Layout-uri tip dashboard: container deja definit în `globals.css` (clase `.ct2`, `.ar`, etc.) — aliniați cardurile la aceleași coloane ca restul aplicației.

## Tipografie

- Titluri de pagină: `font-display` unde e deja aplicat în layout.
- Corp: `var(--font-body)`.
- Date tehnice / loguri: `var(--font-mono)`.

## Accesibilitate

- Focus vizibil: folosiți `--color-focus-ring` sau stiluri echivalente pentru `outline` / `ring` pe controale interactive.
- Nu vă bazați exclusiv pe culoare pentru stări (OK/eroare): combinați cu iconițe, text sau `aria-*`.
- Mod întunecat: design-ul curent este dark-first; token-urile sunt calibrate pentru fundal închis.

## Culori chart

Folosiți `--color-chart-1` … `--color-chart-8` în ordine pentru serii distincte; pentru pie/donut, puteți roti paleta cu `% 8`.
