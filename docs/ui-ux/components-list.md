# CERNIQ.APP — Lista Componentelor UI

Lista completă de componente pentru Design System Dark Terroir.

---

## 1. Primitive UI (13 componente)

| Componentă         | Variante                                                           | Descriere         |
| ------------------ | ------------------------------------------------------------------ | ----------------- |
| **Button**         | 6 variante (primary, secondary, ghost, destructive, outline, link) | CTA, acțiuni      |
| **Input**          | text, email, password, cu label/error                              | Formulare         |
| **Select**         | single, multi                                                      | Dropdown          |
| **Table**          | sortare, filtrare                                                  | Date grid         |
| **Tabs**           | horizontal, vertical                                               | Secțiuni          |
| **Card**           | default, outlined                                                  | Containere        |
| **Badge**          | 9 variante + SBadge 36 statusuri + TBadge                          | Etichete          |
| **Skeleton**       | text, card, custom                                                 | Loading states    |
| **Spinner**        | sm, md, lg                                                         | Loading indicator |
| **Toast** (Sonner) | success, error, info, warning                                      | Notificări        |
| **Separator**      | horizontal, vertical                                               | Divider           |
| **Tooltip**        | —                                                                  | Hover info        |

---

## 2. Data Display (5 componente)

| Componentă      | Descriere                   |
| --------------- | --------------------------- |
| **KpiCard**     | KPI cu label, valoare, icon |
| **ProgressBar** | Bară progres                |
| **StatusDot**   | Indicator status (colorat)  |
| **StatsBar**    | Bară statistici             |
| **ChatMessage** | Mesaj conversație           |

---

## 3. Layout (5 componente)

| Componentă      | Descriere                 |
| --------------- | ------------------------- |
| **AppLayout**   | Shell principal           |
| **Sidebar**     | Collapsible 240px → 64px  |
| **Header**      | Glassmorphism, breadcrumb |
| **Breadcrumb**  | Navigare ierarhică        |
| **PageWrapper** | Container pagină          |

---

## 4. Brand (2 componente)

| Componentă                       | Descriere           |
| -------------------------------- | ------------------- |
| **CerniqLogo**                   | SVG logo            |
| **EtapaBadge** / **EtapaBanner** | Badge etapă curentă |

---

## 5. Feedback (3 componente)

| Componentă        | Descriere         |
| ----------------- | ----------------- |
| **EmptyState**    | Stare goală       |
| **ErrorBoundary** | Erori React       |
| **LoadingPage**   | Loading full page |

---

## 6. Pagini (28 pagini, 7 secțiuni)

### Principal

- Dashboard

### Enrichment

- Import Date
- Bronze Layer (contacts)
- Silver Layer (companies)
- Gold Layer (companies)

### Outreach

- Campanii
- Aprobări

### Analytics

- Rapoarte

### Settings

- Setări

### Auth

- Login
- Forgot Password

_(Restul paginilor conform mock UI_UX_Example)_

---

## 7. Lucide Icons (51 mapate)

| Categorie   | Iconițe                                          |
| ----------- | ------------------------------------------------ |
| **Layout**  | LayoutDashboard, Menu, ChevronLeft, ChevronRight |
| **Data**    | Database, Building, Users, Upload                |
| **Actions** | Send, ClipboardCheck, Refresh, Settings          |
| **Status**  | Check, X, AlertCircle, Info                      |
| **Tier**    | Star, Award                                      |
| **Charts**  | BarChart3, TrendingUp                            |
| **Auth**    | LogIn, LogOut, Eye, EyeOff                       |
| _..._       | _51 total_                                       |

---

## Referințe

- [design-tokens.md](./design-tokens.md) — Tokenuri OKLCH
- [frontend-stack.md](./frontend-stack.md) — Stack tehnic
- [`docs/specifications/Etapa 0/etapa0-Ui_ux etapa0 plan complet.MD`](../specifications/Etapa%200/etapa0-Ui_ux%20etapa0%20plan%20complet.MD)
