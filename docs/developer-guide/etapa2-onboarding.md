# Developer Onboarding: Etapa 2 — Cold Outreach Multi-Canal

**Versiune:** 1.0  
**Actualizat:** 20 Martie 2026

---

## Prezentare Generală

Etapa 2 adaugă un sistem complet de cold outreach multi-canal pe platforma CerniqAPP. Scopul este contactarea automată a leads-urilor din pipeline-ul Etapei 1 via WhatsApp, Cold Email, și Warm Email, cu tracking complet, sentiment analysis AI, și Human-in-the-Loop (HITL) review.

---

## Structura Codului

```text
workers/outreach/src/
├── workers/                   # BullMQ workers (Etapa 2)
│   ├── quota-guardian.ts      # ADR-0054: Lua atomic check Redis
│   ├── whatsapp.ts            # ADR-0057, ADR-0060: WA + jitter
│   ├── email.ts               # ADR-0059: Instantly (cold) + Resend (warm)
│   ├── lead-fsm.ts            # ADR-0062: State machine
│   ├── hitl.ts                # ADR-0064: HITL + SLA
│   ├── sequences.ts           # ADR-0065: Secvențe
│   ├── ai-sentiment.ts        # ADR-0063: Sentiment / intent
│   └── …                      # Alți worker-i (webhooks, reziliență, etc.)
├── utils/
│   └── spintax.ts             # ADR-0058
apps/api/src/routes/
└── outreach.ts                # Endpoint-uri /api/v1/outreach/*

apps/web/src/
├── pages/etapa2/              # Pagini UI
├── hooks/use-etapa2.ts        # React Query hooks
├── lib/etapa2-api.ts          # Client API + tipuri
└── components/outreach/       # Componente reutilizabile

packages/db/src/schemas/
├── outreach.ts                # Tabele schema `outreach`
└── outreach-enums.ts          # Enum-uri PostgreSQL
```

---

## Setup Local

### 1. Cerințe prealabile

- Docker Desktop (PostgreSQL + Redis)
- Node.js v24+ (LTS)
- pnpm v9+

### 2. Variabile de mediu necesare pentru Etapa 2

```bash
# .env.local sau via OpenBao
TIMELINESAI_API_KEY=your-key        # WhatsApp via TimelinesAI
TIMELINESAI_WEBHOOK_SECRET=...      # Verificare semnătură webhook
INSTANTLY_API_KEY=your-key          # Cold Email via Instantly.ai
INSTANTLY_WEBHOOK_SECRET=...
RESEND_API_KEY=re_xxxx              # Warm Email via Resend
RESEND_WEBHOOK_SECRET=...           # Secret Svix
OPENAI_API_KEY=sk-...               # Sentiment analysis AI
```

### 3. Migrare schema outreach

```bash
pnpm db:push
# sau
pnpm --filter @cerniq/db db:migrate
```

### 4. Pornire workers Etapa 2

```bash
pnpm --filter @cerniq/worker-outreach dev
# Cozi înregistrate în `packages/workers/shared` (queue-registry)
```

---

## Concepte Cheie

### Lead State Machine (ADR-0062)

```text
COLD → CONTACTED_WA / CONTACTED_EMAIL → WARM_REPLY → NEGOTIATION → CONVERTED
                                      ↓
                                    DEAD / PAUSED
```

### Quota Guardian (ADR-0054)

- Fiecare telefon WA are `dailyQuotaLimit` mesaje/zi
- Verificare atomică via Lua script Redis înainte de trimitere
- Reset automat la miezul nopții (UTC)

### Channel Segregation (ADR-0059)

- `EMAIL_COLD` → DOAR leads în stare COLD sau CONTACTED_EMAIL
- `EMAIL_WARM` → DOAR leads în stare WARM_REPLY sau NEGOTIATION
- `WHATSAPP` → orice stare activă

### Jitter (ADR-0057)

- Delay 30s + random(0, 120s) pentru mesaje WA
- Simulează comportament uman, evită pattern-uri detectabile

### Spintax (ADR-0058)

- Template-uri pot conține `{varianta1|varianta2|varianta3}`
- Procesare la trimitere → mesaje unice, evită spam filters

---

## API Endpoints Quick Reference

| Method | Path | Descriere |
| --- | --- | --- |
| `GET` | `/api/v1/outreach/dashboard` | KPIs, funnel, quota |
| `GET` | `/api/v1/outreach/leads` | Listă leads cu filtre |
| `GET` | `/api/v1/outreach/leads/:id` | Detalii lead + comunicări |
| `PATCH` | `/api/v1/outreach/leads/:id` | Update stare/asignare |
| `POST` | `/api/v1/outreach/leads/:id/send-message` | Trimite mesaj manual |
| `POST` | `/api/v1/outreach/leads/:id/takeover` | Preluare control uman |
| `GET` | `/api/v1/outreach/sequences` | Liste secvențe |
| `POST` | `/api/v1/outreach/sequences` | Creare secvență |
| `POST` | `/api/v1/outreach/sequences/:id/enroll` | Înrolare leads |
| `GET` | `/api/v1/outreach/templates` | Liste template-uri |
| `POST` | `/api/v1/outreach/templates` | Creare template |
| `GET` | `/api/v1/outreach/phones` | Liste telefoane WA |
| `GET` | `/api/v1/outreach/reviews` | Coadă review |
| `POST` | `/api/v1/outreach/reviews/:id/resolve` | Rezolvare review |
| `GET` | `/api/v1/outreach/analytics/overview` | Analytics |

---

## Frontend: Navigare Pagini

| Rută | Pagină | Componentă |
| --- | --- | --- |
| `/outreach/dashboard` | Dashboard | `pages/etapa2/outreach.tsx` |
| `/outreach/leads` | Lead List | `pages/etapa2/leads.tsx` |
| `/outreach/leads/:id` | Lead Detail | `pages/etapa2/lead-detail.tsx` |
| `/outreach/leads/:id/conversation` | Conversație | `pages/etapa2/conversation-view.tsx` |
| `/outreach/review` | HITL Queue | `pages/etapa2/review.tsx` |
| `/outreach/phones` | Phones WA | `pages/etapa2/phones.tsx` |
| `/outreach/sequences` | Sequences | `pages/etapa2/sequences.tsx` |
| `/outreach/sequences/new` | Secvență nouă | `pages/etapa2/sequence-new.tsx` |
| `/outreach/templates` | Templates | `pages/etapa2/templates.tsx` |
| `/outreach/templates/new` | Template nou | `pages/etapa2/template-new.tsx` |
| `/outreach/campaigns` | Campaigns | `pages/etapa2/campaigns.tsx` |
| `/outreach/analytics` | Analytics | `pages/etapa2/analytics.tsx` |

---

## React Query Hooks

```typescript
import {
  useOutreachDashboard,    // Dashboard KPIs (refetch 30s)
  useOutreachLeads,        // Listă leads cu params
  useOutreachLead,         // Detalii lead
  useOutreachPhones,       // Telefoane WA (refetch 60s)
  useOutreachSequences,    // Secvențe
  useOutreachTemplates,    // Template-uri
  useOutreachReviews,      // Review queue (refetch 30s)
  useOutreachAnalytics,    // Analytics overview
  // Mutations:
  useUpdateLead,
  useSendMessage,
  useTakeover,
  useUpdatePhone,
  usePhoneHealthCheck,
  useCreateSequence,
  useUpdateSequence,
  useEnrollSequence,
  useCreateTemplate,
  useUpdateTemplate,
  useResolveReview,
} from "@/hooks/use-etapa2";
```

---

## Componente Shared Outreach

```typescript
import { StageBadge } from "@/components/outreach/shared/StageBadge";
import { ChannelIcon, ChannelBadge } from "@/components/outreach/shared/ChannelIcon";
import { SentimentIndicator } from "@/components/outreach/shared/SentimentIndicator";
import { PriorityBadge } from "@/components/outreach/shared/PriorityBadge";
import { SlaTimer } from "@/components/outreach/shared/SlaTimer";
import { QuotaUsageGrid } from "@/components/outreach/shared/QuotaUsageGrid";
import { MessageBubble } from "@/components/outreach/conversation/MessageBubble";
import { ConversationTimeline } from "@/components/outreach/conversation/ConversationTimeline";
import { SendMessageDialog } from "@/components/outreach/dialogs/SendMessageDialog";
import { TakeoverDialog } from "@/components/outreach/dialogs/TakeoverDialog";
import { StateChangeDialog } from "@/components/outreach/dialogs/StateChangeDialog";
import { EnrollSequenceDialog } from "@/components/outreach/dialogs/EnrollSequenceDialog";
import { ResolveReviewDialog } from "@/components/outreach/dialogs/ResolveReviewDialog";
```

---

## Testare

### Integration tests (API)

```bash
pnpm --filter @cerniq/api test -- --testPathPattern=etapa2
```

### Worker tests

```bash
pnpm --filter @cerniq/worker-outreach test
```

### Toate testele (monorepo)

```bash
pnpm test
```

---

## Erori comune

### Channel not allowed for current lead state

Lead-ul este în stare WARM_REPLY/NEGOTIATION și încercați EMAIL_COLD.

**Fix:** Folosiți EMAIL_WARM sau WHATSAPP pentru warm leads.

### Phone quota exceeded

Telefonul WA a atins limita zilnică.

**Fix:** Așteptați reset la miezul nopții sau activați un alt telefon.

### Invalid state transition

Tranziție de stare invalidă (ex: CONVERTED → COLD direct).

**Fix:** Verificați `VALID_TRANSITIONS` în `lead-fsm.ts` (worker) și contractul API/UI.

### Template variable missing

Template-ul conține `{{variable}}` dar nu s-a furnizat valoarea.

**Fix:** Asigurați că obiectul `variables` / payload-ul de preview include toate variabilele din body.
