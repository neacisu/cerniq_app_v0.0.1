# CERNIQ.APP — Design Tokens (OKLCH P3)

Toate tokenurile sunt definite în CSS via `@theme` (Tailwind v4). **Niciodată valori hardcodate în componente.**

---

## Brand (Amber/Gold)

| Token  | Valoare             | Utilizare      |
| ------ | ------------------- | -------------- |
| `--b3` | `oklch(.75 .18 85)` | Accent light   |
| `--b4` | `oklch(.70 .17 80)` | Hover          |
| `--b5` | `oklch(.65 .16 75)` | CTA principal  |
| `--b6` | `oklch(.60 .15 70)` | Pressed/active |

---

## Surface (Deep Navy)

| Token    | Valoare              | Utilizare             |
| -------- | -------------------- | --------------------- |
| `--s950` | `oklch(.13 .02 260)` | Fundal principal dark |
| `--s900` | `oklch(.17 .02 260)` | Card background       |
| `--s800` | `oklch(.22 .03 260)` | Card hover            |
| `--s700` | `oklch(.28 .03 260)` | Borders               |
| `--s600` | `oklch(.35 .03 260)` | Muted backgrounds     |

---

## Text

| Token  | Valoare              | Utilizare                |
| ------ | -------------------- | ------------------------ |
| `--t1` | `oklch(.95 .01 260)` | Headings, important data |
| `--t2` | `oklch(.75 .02 260)` | Labels, secondary        |
| `--t3` | `oklch(.55 .02 260)` | Helper text              |
| `--t4` | `oklch(.40 .02 260)` | Disabled, placeholders   |

---

## Semantic

| Token  | Valoare              | Utilizare |
| ------ | -------------------- | --------- |
| `--ok` | `oklch(.72 .20 145)` | Success   |
| `--wa` | `oklch(.80 .18 85)`  | Warning   |
| `--er` | `oklch(.65 .25 25)`  | Error     |
| `--in` | `oklch(.70 .15 240)` | Info      |

---

## Tier (Cerniq)

| Token      | Valoare              | Utilizare   |
| ---------- | -------------------- | ----------- |
| `--bronze` | `oklch(.65 .12 55)`  | Bronze tier |
| `--silver` | `oklch(.70 .03 260)` | Silver tier |
| `--gold`   | `oklch(.78 .17 85)`  | Gold tier   |

---

## Spacing (4px base)

| Token | Valoare                   |
| ----- | ------------------------- |
| Base  | 4px                       |
| Scale | 8, 12, 16, 24, 32, 48, 64 |

---

## Shadows (OKLCH alpha)

| Token           | Utilizare         |
| --------------- | ----------------- |
| `--shadow-sm`   | Subtle elevation  |
| `--shadow-md`   | Cards             |
| `--shadow-lg`   | Modals            |
| `--shadow-glow` | Brand accent glow |

---

## Border Radius

| Token           | Valoare |
| --------------- | ------- |
| `--radius-sm`   | 6px     |
| `--radius-md`   | 10px    |
| `--radius-lg`   | 14px    |
| `--radius-xl`   | 20px    |
| `--radius-full` | 9999px  |

---

## Z-Index

| Layer   | Valoare |
| ------- | ------- |
| Sidebar | 40      |
| Header  | 50      |
| Modal   | 60      |
| Toast   | 70      |
| Tooltip | 80      |

---

## Transitions

| Token               | Valoare                      |
| ------------------- | ---------------------------- |
| `--duration-fast`   | 150ms                        |
| `--duration-normal` | 250ms                        |
| `--duration-slow`   | 350ms                        |
| `--ease-spring`     | `cubic-bezier(.4, 0, .2, 1)` |
