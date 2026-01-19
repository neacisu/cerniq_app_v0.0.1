# CERNIQ.APP — ETAPA 4: ARCHITECTURE DECISION RECORDS
## ADRs pentru Monitorizare Post-Vânzare
### Versiunea 1.0 | 19 Ianuarie 2026

---

## ADR-E4-001: Revolut Business API Integration

### Status
ACCEPTED

### Context
Sistemul necesită procesarea în timp real a plăților pentru reconcilierea cu facturile emise. Există mai multe opțiuni: polling periodic, webhook integration, sau hybrid.

### Decision
Adoptăm **webhook-first approach** cu Revolut Business API:
- Webhook pentru notificări în timp real
- Polling periodic (*/30min) ca backup pentru balance sync
- HMAC signature validation pentru securitate

### Consequences
**Pozitive:**
- Procesare în timp real a plăților
- Reducere latență reconciliere
- Mai puține API calls (cost redus)

**Negative:**
- Necesită endpoint public expus
- Complexitate pentru retry și idempotency
- Dependență de disponibilitatea webhook delivery

### Implementation Notes
```typescript
// Webhook endpoint cu idempotency
POST /webhooks/revolut/business
Headers: X-Revolut-Signature-V1, X-Webhook-Id
Body: TransactionCreated | TransactionStateChanged
```

---

## ADR-E4-002: Three-Tier Payment Reconciliation

### Status
ACCEPTED

### Context
Plățile primite necesită matching cu facturile emise. Matching-ul exact nu este întotdeauna posibil (referințe lipsă, sume diferite, etc.).

### Decision
Implementăm reconciliere în trei trepte:

1. **Tier 1 - Exact Match**: Referință factură exactă + sumă ±0.01
2. **Tier 2 - Fuzzy Match**: Sumă ±5% + fuzzy name matching ≥85%
3. **Tier 3 - HITL**: Candidați prezentați operatorului pentru selecție manuală

### Consequences
**Pozitive:**
- Automatizare maximă pentru cazuri clare
- Escalare graduală
- Audit trail complet

**Negative:**
- Complexitate implementare
- Posibile false positives la fuzzy

---

## ADR-E4-003: Credit Scoring via Termene.ro

### Status
ACCEPTED

### Context
Evaluarea riscului de credit necesită date externe despre companii (ANAF, bilanț, insolvență).

### Decision
Integrare cu **Termene.ro API** pentru:
- Status ANAF și TVA
- Date financiare din bilanțuri
- BPI (Buletinul Procedurilor de Insolvență)
- Litigii active

Formula scoring:
- ANAF Status: 15 puncte
- Financial Health: 30 puncte
- Payment History (intern): 25 puncte
- BPI Status: 20 puncte
- Litigation Risk: 10 puncte

### Consequences
**Pozitive:**
- Date comprehensive și actualizate
- API stabil și documentat
- Conformitate GDPR (date publice)

**Negative:**
- Cost per query
- Dependență de vendor extern
- Rate limiting (20 req/sec)

---

## ADR-E4-004: Dynamic Contract Generation

### Status
ACCEPTED

### Context
Contractele trebuie generate dinamic pe baza risk tier-ului clientului cu clauze specifice.

### Decision
Sistem de **template-based contract generation**:
- Templates DOCX cu Jinja2 placeholders
- Clause library cu dependencies și conflicts
- Python docxtpl pentru generare
- LibreOffice headless pentru PDF conversion
- DocuSign pentru semnături digitale

### Consequences
**Pozitive:**
- Flexibilitate în personalizare
- Audit trail pentru clauze folosite
- Conformitate legală asigurată

**Negative:**
- Complexitate workflow
- Dependență DocuSign (cost)

---

## ADR-E4-005: Sameday Courier Integration

### Status
ACCEPTED

### Context
Logistica livrărilor necesită integrare cu servicii de curierat pentru AWB, tracking și COD.

### Decision
Integrare **Sameday Courier** ca carrier principal:
- API pentru generare AWB
- Webhook pentru status updates
- COD collection tracking
- Return shipment support

### Consequences
**Pozitive:**
- Acoperire națională bună
- API modern și documentat
- Support pentru locker și pickup points

**Negative:**
- Single carrier dependency
- Costuri variabile

---

## ADR-E4-006: Event-Driven Order Lifecycle

### Status
ACCEPTED

### Context
Ciclul de viață al unei comenzi traversează multiple state și declanșează acțiuni în cascade.

### Decision
Adoptăm **event-driven state machine** pentru orders:

```
State Machine: Order Lifecycle
─────────────────────────────
DRAFT → PENDING_PAYMENT → PAYMENT_RECEIVED
                       ↓
               CREDIT_CHECK
                  ↙    ↘
      CREDIT_APPROVED   CREDIT_BLOCKED → HITL → CREDIT_APPROVED
            ↓
    CONTRACT_PENDING → CONTRACT_SIGNED → PROCESSING
                                            ↓
    READY_FOR_PICKUP → PICKED_UP → IN_TRANSIT → DELIVERED → COMPLETED
                                        ↓              ↓
                             DELIVERY_FAILED    RETURN_REQUESTED
```

### Consequences
**Pozitive:**
- Flow clar și auditabil
- Triggers automate
- Easy rollback

**Negative:**
- Complexitate state machine
- Race conditions posibile

---

## ADR-E4-007: HITL Approval System Design

### Status
ACCEPTED

### Context
Anumite decizii necesită intervenție umană (credit override, refund mare, reconciliere manuală).

### Decision
Sistem **unified HITL** cu:
- Single approval queue
- SLA-based escalation
- Role-based routing
- Slack + Email notifications

Approval Matrix:
| Task Type | Approver | SLA | Escalate To |
|-----------|----------|-----|-------------|
| credit:override:small | SALES_MANAGER | 4h | CFO |
| credit:override:large | CFO | 2h | CEO |
| refund:large | FINANCE_MANAGER | 4h | CFO |
| payment:unmatched | ACCOUNTING | 8h | CFO |

### Consequences
**Pozitive:**
- Centralizare decizii
- Audit complet
- Escalare automată

**Negative:**
- Bottleneck potențial
- Training necesar

---

## ADR-E4-008: Partitioned Audit Tables

### Status
ACCEPTED

### Context
Audit logs pot crește rapid și impacta performanța query-urilor.

### Decision
**Table partitioning** by month pentru audit_logs și tracking:
- Range partitioning pe created_at
- Auto-create partitions pentru 3 luni în avans
- Retention policy: 7 ani (GDPR), apoi anonymize

### Consequences
**Pozitive:**
- Query performance menținută
- Easy archival
- Compliance asigurat

**Negative:**
- Complexitate DDL
- Maintenance overhead

---

## ADR-E4-009: Real-Time Dashboard via WebSocket

### Status
ACCEPTED

### Context
Dashboard-ul necesită actualizări în timp real pentru KPIs și alerte.

### Decision
**WebSocket + Redis Pub/Sub** pentru real-time updates:
- Socket.io pentru WebSocket management
- Redis channels pentru event distribution
- Optimistic updates în UI
- Fallback polling la 30s pentru reliability

### Consequences
**Pozitive:**
- UX responsive
- Reduce server load vs polling
- Instant alerts

**Negative:**
- Complexitate infrastructure
- Connection management

---

## ADR-E4-010: Oblio Stock Sync Strategy

### Status
ACCEPTED

### Context
Stocul trebuie sincronizat bidirecțional între Cerniq și Oblio (sistemul de facturare).

### Decision
**Periodic sync** cu reservation system:
- Sync from Oblio: */15min cron
- Reserve on order create
- Deduct on delivery confirmation
- Release on cancel

### Consequences
**Pozitive:**
- Eventual consistency acceptabilă
- Low API usage
- Clear reservation model

**Negative:**
- 15min delay în stock visibility
- Potential oversell în peak

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
