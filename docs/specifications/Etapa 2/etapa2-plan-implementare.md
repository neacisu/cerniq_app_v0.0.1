# CERNIQ.APP — ETAPA 2: PLAN IMPLEMENTARE GRANULAR COMPLET
## Faze, Subfaze și Taskuri pentru Cold Outreach Multi-Canal
### Versiunea 1.1 | 2 Februarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Plan complet implementare Cold Outreach cu taskuri JSON pentru AI Agents  
**FORMAT:** F2.x.x.Txxx (Fază.Subfază.Task) - continuare din Etapa 0/1  
**SPRINT FORMAT:** E2.Sx.PRx.xxx (Etapă.Sprint.PR.Task) - conform sprint-plan.md  
**PREREQUISITE:** Etapa 1 completă (Gold layer populat)

---

## MAPARE FAZE → SPRINTURI

### Convenția Duală de Numerotare

Acest document folosește formatul **Phase (F2.x.x.Txxx)** pentru definiția granulară a taskurilor.
Documentul `etapa2-sprint-plan.md` folosește formatul **Sprint (E2.Sx.PRx.xxx)** pentru execuție.

### Matrice de Conversie

| Faze | Sprint | PR Range | Nr. Tasks | Focus |
|------|--------|----------|-----------|-------|
| F2.1 - F2.4 | **E2.S1** | PR1-PR6 | 23 | Foundation & Integrations |
| F2.5 - F2.8 | **E2.S2** | PR1-PR8 | 26 | Workers Core |
| F2.9 - F2.14 | **E2.S3** | PR1-PR6 | 31 | Intelligence & HITL |
| F2.15 - F2.20 | **E2.S4** | PR1-PR8 | 38 | Frontend & Testing |

### Formula de Conversie

```text
Phase ID: F2.{phase}.{subphase}.T{xxx}
Sprint ID: E2.S{sprint}.PR{pr}.{xxx}

Reguli:
├── F2.1 → F2.4   → E2.S1 (Sprint 1: Foundation)
├── F2.5 → F2.8   → E2.S2 (Sprint 2: Workers)  
├── F2.9 → F2.14  → E2.S3 (Sprint 3: Intelligence)
└── F2.15 → F2.20 → E2.S4 (Sprint 4: Frontend)

Exemple:
F2.1.1.T001 → E2.S1.PR1.001
F2.5.1.T001 → E2.S2.PR1.001
F2.9.1.T001 → E2.S3.PR1.001
F2.15.1.T001 → E2.S4.PR1.001
```

### Cross-Reference

| Document | Format Folosit | Locație |
|----------|---------------|---------|
| `etapa2-plan-implementare.md` | F2.x.x.Txxx | Acest document |
| `etapa2-sprint-plan.md` | E2.Sx.PRx.xxx | `./etapa2-sprint-plan.md` |
| `etapa2-api-endpoints.md` | Per module | `./etapa2-api-endpoints.md` |
| `openapi-etapa2.yaml` | REST paths | `../../api/openapi-etapa2.yaml` |

---

## CUPRINS FAZE

| Fază | Denumire | Nr. Taskuri |
|------|----------|-------------|
| F2.1 | Database Schema Outreach | 8 |
| F2.2 | TimelinesAI Integration | 6 |
| F2.3 | Instantly.ai Integration | 5 |
| F2.4 | Resend Integration | 4 |
| F2.5 | Quota Guardian System | 6 |
| F2.6 | Orchestration Workers | 6 |
| F2.7 | WhatsApp Workers | 8 |
| F2.8 | Email Workers | 6 |
| F2.9 | Webhook Handlers | 6 |
| F2.10 | Sequence Management | 5 |
| F2.11 | Lead State Machine | 4 |
| F2.12 | AI Sentiment Analysis | 5 |
| F2.13 | Human Review System | 6 |
| F2.14 | Monitoring & Alerts | 5 |
| F2.15 | Frontend Dashboard | 8 |
| F2.16 | Frontend Lead Management | 7 |
| F2.17 | Frontend Review Queue | 5 |
| F2.18 | API Endpoints | 8 |
| F2.19 | Testing | 6 |
| F2.20 | Documentation | 4 |
| **TOTAL** | | **118 Taskuri** |

---

# FAZA F2.1: DATABASE SCHEMA OUTREACH

## F2.1.1 Gold Layer Extension

```json
{
  "taskID": "F2.1.1.T001",
  "denumire_task": "Creare enum types pentru Etapa 2 Outreach",
  "context_anterior": "Etapa 1 completă cu Bronze/Silver/Gold schema. Gold layer conține leads pregătiți pentru outreach. Acum extindem schema pentru cold outreach multi-canal.",
  "descriere_task": "Ești un expert PostgreSQL DBA. Creează migrația Drizzle pentru enum types necesare în Etapa 2.\n\nCreează fișierul packages/db/drizzle/0200_outreach_enums.ts:\n\n```typescript\nimport { sql } from 'drizzle-orm';\nimport { pgEnum } from 'drizzle-orm/pg-core';\n\n// Current states (FSM)\nexport const currentStateEnum = pgEnum('current_state_enum', [\n  'COLD',\n  'CONTACTED_WA',\n  'CONTACTED_EMAIL',\n  'WARM_REPLY',\n  'NEGOTIATION',\n  'CONVERTED',\n  'DEAD',\n  'PAUSED'\n]);\n\n// Communication channels\nexport const channelEnum = pgEnum('channel_enum', [\n  'WHATSAPP',\n  'EMAIL_COLD',\n  'EMAIL_WARM',\n  'PHONE',\n  'MANUAL'\n]);\n\n// Message direction\nexport const messageDirectionEnum = pgEnum('message_direction_enum', [\n  'OUTBOUND',\n  'INBOUND'\n]);\n\n// Message status\nexport const messageStatusEnum = pgEnum('message_status_enum', [\n  'QUEUED',\n  'SENT',\n  'DELIVERED',\n  'READ',\n  'REPLIED',\n  'BOUNCED',\n  'FAILED',\n  'OPENED',\n  'CLICKED'\n]);\n\n// Phone status\nexport const phoneStatusEnum = pgEnum('phone_status_enum', [\n  'ACTIVE',\n  'PAUSED',\n  'OFFLINE',\n  'BANNED',\n  'RECONNECTING',\n  'QUARANTINE'\n]);\n\n// Review priority\nexport const reviewPriorityEnum = pgEnum('review_priority_enum', [\n  'LOW',\n  'MEDIUM',\n  'HIGH',\n  'URGENT'\n]);\n\n// Review reason\nexport const reviewReasonEnum = pgEnum('review_reason_enum', [\n  'NEGATIVE_SENTIMENT',\n  'KEYWORD_TRIGGER',\n  'BOUNCE_DETECTED',\n  'COMPLAINT',\n  'MANUAL_FLAG',\n  'AI_UNCERTAIN'\n]);\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE exact valorile enum din documentația Etapa 2",
    "NU modifica naming conventions - snake_case pentru enum names",
    "VERIFICĂ că nu există conflicte cu enum-urile din Etapa 1",
    "NU adăuga valori enum nedocumentate"
  ],
  "validare_task": "1. Fișierul există și compilează fără erori\n2. Toate 7 enum types sunt definite\n3. pnpm drizzle-kit generate rulează cu succes\n4. Nu există conflicte de nume cu schema existentă",
  "outcome": "Enum types pentru Etapa 2 definite și gata pentru utilizare în tabele"
}
```

```json
{
  "taskID": "F2.1.1.T002",
  "denumire_task": "Creare tabel gold_lead_journey pentru state machine",
  "context_anterior": "Enum types create în F2.1.1.T001. Tabelul gold_lead_journey extinde Gold layer cu tracking pentru outreach journey.",
  "descriere_task": "Creează migrația pentru tabelul principal gold_lead_journey care gestionează state machine pentru fiecare lead.\n\nCreează packages/db/drizzle/0201_gold_lead_journey.ts:\n\n```typescript\nimport { pgTable, uuid, varchar, boolean, integer, timestamp, text, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';\nimport { currentStateEnum, channelEnum, reviewPriorityEnum, reviewReasonEnum } from './0200_outreach_enums';\nimport { goldCompanies } from './schema';\nimport { users, tenants } from './schema';\n\nexport const goldLeadJourney = pgTable('gold_lead_journey', {\n  id: uuid('id').primaryKey().defaultRandom(),\n  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),\n  leadId: uuid('lead_id').notNull().references(() => goldCompanies.id, { onDelete: 'cascade' }),\n  \n  // WhatsApp Assignment (STICKY)\n  assignedPhoneId: uuid('assigned_phone_id').references(() => waPhoneNumbers.id),\n  assignedAt: timestamp('assigned_at', { withTimezone: true }),\n  \n  // State Machine\n  currentState: currentStateEnum('current_state').notNull().default('COLD'),\n  previousState: currentStateEnum('previous_state'),\n  stateChangedAt: timestamp('state_changed_at', { withTimezone: true }).defaultNow(),\n  stateChangeReason: text('state_change_reason'),\n  \n  // Quota Tracking\n  quotaConsumptionDate: varchar('quota_consumption_date', { length: 10 }),\n  isNewContact: boolean('is_new_contact').default(true),\n  firstContactChannel: channelEnum('first_contact_channel'),\n  \n  // Channel Preferences\n  lastChannelUsed: channelEnum('last_channel_used'),\n  preferredChannel: channelEnum('preferred_channel'),\n  emailOptedOut: boolean('email_opted_out').default(false),\n  whatsappOptedOut: boolean('whatsapp_opted_out').default(false),\n  \n  // Sequence State\n  currentSequenceId: uuid('current_sequence_id'),\n  sequenceStep: integer('sequence_step').default(0),\n  sequenceStartedAt: timestamp('sequence_started_at', { withTimezone: true }),\n  sequencePaused: boolean('sequence_paused').default(false),\n  nextActionAt: timestamp('next_action_at', { withTimezone: true }),\n  \n  // Scoring\n  sentimentScore: integer('sentiment_score').default(0),\n  engagementScore: integer('engagement_score').default(0),\n  replyCount: integer('reply_count').default(0),\n  openCount: integer('open_count').default(0),\n  clickCount: integer('click_count').default(0),\n  \n  // Human Intervention\n  requiresHumanReview: boolean('requires_human_review').default(false),\n  humanReviewReason: reviewReasonEnum('human_review_reason'),\n  humanReviewPriority: reviewPriorityEnum('human_review_priority'),\n  isHumanControlled: boolean('is_human_controlled').default(false),\n  assignedToUser: uuid('assigned_to_user').references(() => users.id),\n  \n  // Timestamps\n  firstContactAt: timestamp('first_contact_at', { withTimezone: true }),\n  lastContactAt: timestamp('last_contact_at', { withTimezone: true }),\n  lastReplyAt: timestamp('last_reply_at', { withTimezone: true }),\n  lastOpenAt: timestamp('last_open_at', { withTimezone: true }),\n  convertedAt: timestamp('converted_at', { withTimezone: true }),\n  \n  // Metadata\n  tags: jsonb('tags').default([]),\n  customFields: jsonb('custom_fields').default({}),\n  \n  // Audit\n  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),\n}, (table) => ({\n  uniqueLeadJourney: uniqueIndex('idx_unique_lead_journey').on(table.tenantId, table.leadId),\n  tenantStateIdx: index('idx_lead_journey_tenant_state').on(table.tenantId, table.currentState),\n  phoneIdx: index('idx_lead_journey_phone').on(table.assignedPhoneId),\n  nextActionIdx: index('idx_lead_journey_next_action').on(table.nextActionAt),\n  reviewIdx: index('idx_lead_journey_review').on(table.tenantId, table.requiresHumanReview),\n}));\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE exact coloanele din documentația schema",
    "NU uita constraint-ul UNIQUE pe (tenant_id, lead_id)",
    "INCLUDE toate index-urile pentru performanță",
    "VERIFICĂ că sentimentScore are range -100 to 100"
  ],
  "validare_task": "1. Migrația compilează fără erori\n2. pnpm drizzle-kit push creează tabelul\n3. Index-urile sunt create corect\n4. Foreign keys sunt valide",
  "outcome": "Tabel gold_lead_journey creat cu toate coloanele și index-urile necesare"
}
```

```json
{
  "taskID": "F2.1.1.T003",
  "denumire_task": "Creare tabel gold_communication_log pentru audit trail",
  "context_anterior": "gold_lead_journey creat în F2.1.1.T002. Acum creăm tabelul pentru logging complet al comunicărilor.",
  "descriere_task": "Creează packages/db/drizzle/0202_gold_communication_log.ts cu tabelul pentru audit trail complet al tuturor comunicărilor outreach (WhatsApp, Email Cold, Email Warm).\n\nTabelul trebuie să includă:\n- Foreign key la gold_lead_journey\n- Tracking pentru toate channel types\n- Status tracking (queued, sent, delivered, read, replied, bounced)\n- External IDs (TimelinesAI message_id, Instantly lead_id, Resend email_id)\n- Content hash pentru deduplicare\n- Quota cost tracking (1 pentru new, 0 pentru follow-up)\n- Raw request/response pentru debugging\n- Sequence context (sequence_id, step)",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": [
    "NU stoca full content în tabel - folosește content_preview (500 chars) și reference la storage",
    "INCLUDE content_hash pentru deduplicare mesaje",
    "VERIFICĂ că quota_cost poate fi 0 sau 1",
    "ADAUGĂ index pe external_message_id pentru webhook lookup"
  ],
  "validare_task": "1. Tabelul are toate coloanele din schema documentată\n2. Index pe thread_id pentru conversation lookup\n3. Index pe created_at DESC pentru timeline\n4. Partitioning ready (comments în code)",
  "outcome": "Tabel gold_communication_log creat pentru audit complet al comunicărilor"
}
```

```json
{
  "taskID": "F2.1.1.T004",
  "denumire_task": "Creare tabel wa_phone_numbers pentru managementul celor 20 numere",
  "context_anterior": "Tabele lead_journey și communication_log create. Acum creăm tabelul pentru cele 20 numere WhatsApp.",
  "descriere_task": "Creează packages/db/drizzle/0203_wa_phone_numbers.ts pentru managementul pool-ului de 20 numere WhatsApp integrate cu TimelinesAI.\n\nTabelul include:\n- Phone identity și label\n- TimelinesAI integration IDs\n- Status enum (ACTIVE, PAUSED, OFFLINE, BANNED, QUARANTINE)\n- Daily quota tracking (soft - Redis este sursa de adevăr)\n- Health metrics\n- Reputation scoring",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": [
    "IMPORTANT: daily_quota_limit default 200 - HARD LIMIT WhatsApp",
    "NU uita timelinesai_account_id - necesar pentru API calls",
    "INCLUDE reputation_score (0-100) pentru monitoring",
    "ADAUGĂ last_health_check_at pentru status sync"
  ],
  "validare_task": "1. Tabel creat cu toate 20+ coloane\n2. Status enum include toate valorile\n3. daily_quota_limit default 200\n4. UNIQUE constraint pe phone_number",
  "outcome": "Tabel wa_phone_numbers creat pentru management pool telefoane"
}
```

```json
{
  "taskID": "F2.1.1.T005",
  "denumire_task": "Creare tabel wa_quota_usage pentru tracking zilnic",
  "context_anterior": "wa_phone_numbers creat. Acum creăm tabelul pentru tracking istoric al utilizării cotelor.",
  "descriere_task": "Creează packages/db/drizzle/0204_wa_quota_usage.ts pentru tracking zilnic per telefon. Acest tabel este BACKUP/AUDIT - Redis este sursa de adevăr pentru verificări real-time.",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": [
    "UNIQUE constraint pe (phone_id, usage_date)",
    "NU folosi acest tabel pentru verificări real-time - doar Redis",
    "INCLUDE first_message_at și last_message_at pentru analytics"
  ],
  "validare_task": "1. UNIQUE (phone_id, usage_date) există\n2. Index pe usage_date DESC pentru reporting\n3. Toate coloanele din schema documentată",
  "outcome": "Tabel wa_quota_usage creat pentru audit istoric"
}
```

```json
{
  "taskID": "F2.1.1.T006",
  "denumire_task": "Creare tabele outreach_sequences și sequence_steps",
  "context_anterior": "Tabele core create. Acum creăm tabelele pentru sequence management (follow-up automation).",
  "descriere_task": "Creează packages/db/drizzle/0205_outreach_sequences.ts cu:\n\n1. outreach_sequences - definirea secvențelor\n2. outreach_sequence_steps - pașii individuali cu delay și template\n3. sequence_enrollments - tracking leads înrolați în secvențe",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": [
    "delay_hours și delay_minutes pentru flexibilitate timing",
    "UNIQUE (sequence_id, step_number) pentru pași",
    "stop_on_reply default TRUE - oprește secvența când lead răspunde",
    "respect_business_hours default TRUE"
  ],
  "validare_task": "1. Toate 3 tabele create corect\n2. Foreign keys valide\n3. UNIQUE constraints în loc",
  "outcome": "Tabele sequence management create"
}
```

```json
{
  "taskID": "F2.1.1.T007",
  "denumire_task": "Creare tabel outreach_templates pentru template library",
  "context_anterior": "Sequence tables create. Acum creăm tabelul pentru template library cu suport spintax.",
  "descriere_task": "Creează packages/db/drizzle/0206_outreach_templates.ts pentru message templates cu:\n- Content cu spintax support\n- Variables definition (JSONB array)\n- Channel specific (WhatsApp/Email)\n- A/B testing support (template_versions table)\n- Performance metrics (open_rate, reply_rate)",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": [
    "content suportă spintax: {option1|option2}",
    "variables JSONB array cu required flag per variable",
    "INCLUDE has_media boolean pentru WhatsApp media messages"
  ],
  "validare_task": "1. Template table cu content spintax\n2. Template versions pentru A/B\n3. Index pe (tenant_id, channel, is_active)",
  "outcome": "Template library tables create"
}
```

```json
{
  "taskID": "F2.1.1.T008",
  "denumire_task": "Creare tabel human_review_queue și outreach_daily_stats",
  "context_anterior": "Toate tabelele core create. Finalizăm cu review queue și daily statistics.",
  "descriere_task": "Creează packages/db/drizzle/0207_review_and_stats.ts cu:\n\n1. human_review_queue - pentru HITL items cu SLA tracking\n2. outreach_daily_stats - metrici agregate zilnice per tenant",
  "director_implementare": "/var/www/CerniqAPP/packages/db/drizzle",
  "restrictii_antihalucinatie": [
    "SLA cu sla_due_at și sla_breached boolean",
    "daily_stats cu UNIQUE (tenant_id, stat_date)",
    "INCLUDE bounce_rate calculation fields"
  ],
  "validare_task": "1. Review queue cu SLA fields\n2. Daily stats aggregation ready\n3. All indexes created",
  "outcome": "Review queue și statistics tables create"
}
```

---

# FAZA F2.2: TIMELINESAI INTEGRATION

## F2.2.1 TimelinesAI Client Setup

```json
{
  "taskID": "F2.2.1.T001",
  "denumire_task": "Creare TimelinesAI API client cu rate limiting",
  "context_anterior": "Schema database completă. Acum integrăm TimelinesAI pentru WhatsApp messaging.",
  "descriere_task": "Creează packages/integrations/timelinesai/client.ts cu:\n\n- Axios instance configurată cu baseURL, auth headers\n- Rate limiting (50 requests/min/account)\n- Retry logic cu exponential backoff\n- Request/response logging\n- Error handling pentru status codes specifice",
  "director_implementare": "/var/www/CerniqAPP/packages/integrations/timelinesai",
  "restrictii_antihalucinatie": [
    "API key din environment variable TIMELINESAI_API_KEY",
    "baseURL: https://api.timelines.ai/v1",
    "NU hardcoda API keys în cod",
    "INCLUDE timeout 30s pentru requests"
  ],
  "validare_task": "1. Client compilează și exportă corect\n2. Rate limiter funcțional\n3. Environment variable validated la startup",
  "outcome": "TimelinesAI client configurat și gata de utilizare"
}
```

```json
{
  "taskID": "F2.2.1.T002",
  "denumire_task": "Implementare TimelinesAI sendMessage și getChatHistory",
  "context_anterior": "Client base creat. Implementăm metodele principale pentru messaging.",
  "descriere_task": "Adaugă metodele în timelinesai client:\n\n1. sendMessage(phoneId, recipient, message) - trimite mesaj\n2. getChatHistory(chatId, limit) - istoric conversație\n3. getAccountStatus(phoneId) - status conexiune\n4. getChats(phoneId, limit) - lista conversații",
  "director_implementare": "/var/www/CerniqAPP/packages/integrations/timelinesai",
  "restrictii_antihalucinatie": [
    "sendMessage returnează message_id și chat_id",
    "getChatHistory păstrează ordinea cronologică",
    "HANDLE erori specifice: 429 (rate limit), 401 (auth), 400 (invalid number)"
  ],
  "validare_task": "1. Toate 4 metode implementate\n2. Types pentru responses definite\n3. Error handling complet",
  "outcome": "TimelinesAI core methods implementate"
}
```

```json
{
  "taskID": "F2.2.1.T003",
  "denumire_task": "Setup TimelinesAI webhook endpoint",
  "context_anterior": "Client methods implementate. Acum configurăm webhook pentru incoming messages.",
  "descriere_task": "Creează apps/api/src/features/webhooks/timelinesai.handler.ts:\n\n- POST /webhooks/timelinesai endpoint\n- Signature verification\n- Payload parsing și normalizare\n- Queue job pentru processing",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/features/webhooks",
  "restrictii_antihalucinatie": [
    "VERIFICĂ webhook signature cu TIMELINESAI_WEBHOOK_SECRET",
    "RETURN 200 OK imediat, procesare în background",
    "SKIP from_me messages (outbound)",
    "LOG raw payload pentru debugging"
  ],
  "validare_task": "1. Endpoint înregistrat în Fastify\n2. Signature verification funcțională\n3. Job queued pentru fiecare mesaj valid",
  "outcome": "TimelinesAI webhook handler configurat"
}
```

---

# FAZA F2.5: QUOTA GUARDIAN SYSTEM

## F2.5.1 Redis Lua Scripts

```json
{
  "taskID": "F2.5.1.T001",
  "denumire_task": "Implementare Redis Lua script pentru atomic quota check",
  "context_anterior": "Integrări externe configurate. Implementăm Quota Guardian - sistemul critic care protejează de ban.",
  "descriere_task": "Creează workers/quota/lua/quota_check.lua cu scriptul Lua pentru verificare atomică:\n\n1. Check phone status (ACTIVE required)\n2. Check business hours (09:00-18:00)\n3. Check quota (200 NEW/day limit)\n4. Increment if allowed\n5. Return JSON result\n\nScriptul trebuie să fie ATOMIC pentru a preveni race conditions.",
  "director_implementare": "/var/www/CerniqAPP/workers/quota/lua",
  "restrictii_antihalucinatie": [
    "ATOMIC - totul într-un singur EVAL",
    "FOLLOW-UP (cost=0) ALWAYS allowed",
    "NEW contact (cost=1) checked against 200 limit",
    "TTL 48h pe quota keys pentru safety"
  ],
  "validare_task": "1. Script loadează în Redis fără erori\n2. Test cu multiple concurrent calls funcționează atomic\n3. Business hours check corect\n4. Quota increment doar când allowed",
  "outcome": "Lua script pentru quota check atomic implementat"
}
```

```json
{
  "taskID": "F2.5.1.T002",
  "denumire_task": "Implementare Quota Guardian Check Worker",
  "context_anterior": "Lua script creat. Implementăm worker-ul BullMQ care utilizează script-ul.",
  "descriere_task": "Creează workers/quota/guardian-check.worker.ts:\n\n- Load și cache Lua script SHA\n- Execute EVALSHA cu parametrii\n- Parse JSON result\n- Calculate delay until dacă rejected\n- Find alternative phone dacă quota exceeded",
  "director_implementare": "/var/www/CerniqAPP/workers/quota",
  "restrictii_antihalucinatie": [
    "Concurrency 100 - acest worker trebuie să fie RAPID",
    "Timeout 2000ms MAX",
    "NU retry - verificarea este instant",
    "LOG toate rezultatele pentru audit"
  ],
  "validare_task": "1. Worker procesează job-uri corect\n2. Lua script execution sub 10ms\n3. Alternative phone finding funcțional\n4. Delay calculation pentru next business hour",
  "outcome": "Quota Guardian Check Worker operațional"
}
```

---

# FAZA F2.15: FRONTEND DASHBOARD

## F2.15.1 Dashboard Components

```json
{
  "taskID": "F2.15.1.T001",
  "denumire_task": "Creare pagină Outreach Dashboard cu KPIs",
  "context_anterior": "Backend workers și API complete. Implementăm UI pentru dashboard.",
  "descriere_task": "Creează apps/web/src/pages/outreach/dashboard.tsx:\n\n- KPI cards: Leads contactați, Răspunsuri, Rate răspuns, Reviews pending\n- Quota usage grid pentru 20 telefoane\n- Channel performance chart\n- Lead funnel visualization\n- Recent activity feed",
  "director_implementare": "/var/www/CerniqAPP/apps/web/src/pages/outreach",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE Shadcn/ui components",
    "Tailwind pentru styling - NU CSS custom",
    "React Query pentru data fetching",
    "Recharts pentru charts"
  ],
  "validare_task": "1. Pagina renderează fără erori\n2. KPIs update în real-time\n3. Quota grid arată toate 20 telefoane\n4. Charts responsive",
  "outcome": "Outreach Dashboard pagină completă"
}
```

```json
{
  "taskID": "F2.15.1.T002",
  "denumire_task": "Creare QuotaUsageGrid component",
  "context_anterior": "Dashboard page creat. Implementăm componenta pentru vizualizare quota per telefon.",
  "descriere_task": "Creează apps/web/src/components/outreach/QuotaUsageGrid.tsx:\n\n- Grid 10x2 pentru 20 telefoane\n- Progress bar per telefon (0-200)\n- Color coding: verde (<90%), amber (90-99%), roșu (100% sau offline)\n- Tooltip cu detalii\n- Click pentru detalii telefon",
  "director_implementare": "/var/www/CerniqAPP/apps/web/src/components/outreach",
  "restrictii_antihalucinatie": [
    "Tooltip arată phone_number, usage/limit, status",
    "Animate progress bars",
    "Handle offline/banned status vizual distinct",
    "Responsive pe mobile"
  ],
  "validare_task": "1. Grid renderează 20 telefoane\n2. Colors corecte per threshold\n3. Tooltips funcționale\n4. Click navigation funcțional",
  "outcome": "QuotaUsageGrid component complet"
}
```

---

# FAZA F2.18: API ENDPOINTS

## F2.18.1 Outreach API Routes

```json
{
  "taskID": "F2.18.1.T001",
  "denumire_task": "Implementare GET /api/v1/outreach/leads endpoint",
  "context_anterior": "Frontend și backend components create. Implementăm REST API endpoints.",
  "descriere_task": "Creează apps/api/src/features/outreach/routes.ts cu:\n\n- GET /api/v1/outreach/leads - list leads cu filtering\n- Query params: stage, channel, assignedTo, hasReply, needsReview, search, page, limit\n- Include company data în response\n- Sorting by nextActionAt, lastContactAt, sentimentScore",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/features/outreach",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE Zod pentru validation",
    "Pagination default 20, max 100",
    "Include total count în response meta",
    "RLS filter by tenant_id automat"
  ],
  "validare_task": "1. Endpoint returnează leads corect\n2. Filtering funcțional pentru toate params\n3. Pagination corectă\n4. Performance sub 100ms pentru 1000 leads",
  "outcome": "Leads list endpoint implementat"
}
```

---

**Document generat:** 15 Ianuarie 2026
**Total Taskuri:** 118
**Estimare:** 8-10 săptămâni
**Conformitate:** Master Spec v1.2
