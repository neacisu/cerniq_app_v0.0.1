# ADR-FAMILY-e4-cash

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e4-cash |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E4 |
| Familie | `cash` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e4-cash` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Flux monetar post-vânzare: Revolut webhooks, înregistrare tranzacții, reconciliere trei niveluri, sold, restanțe.

## Dovezi confirmate în Cerniq

### Revolut (A1–A6)

| nodeKey | Coadă |
| --- | --- |
| `e4:revolut:webhook-ingest` | `revolut:webhook:ingest` |
| `e4:revolut:transaction-process` | `revolut:transaction:process` |
| `e4:revolut:payment-record` | `revolut:payment:record` |
| `e4:revolut:refund-process` | `revolut:refund:process` |
| `e4:revolut:balance-sync` | `revolut:balance:sync` |
| `e4:revolut:webhook-validate` | `revolut:webhook:validate` |

### Reconciliere plăți (B7–B12)

| nodeKey | Coadă |
| --- | --- |
| `e4:payment:reconcile-auto` | `payment:reconcile:auto` |
| `e4:payment:reconcile-fuzzy` | `payment:reconcile:fuzzy` |
| `e4:payment:reconcile-manual` | `payment:reconcile:manual` |
| `e4:payment:balance-update` | `payment:balance:update` |
| `e4:payment:overdue-detect` | `payment:overdue:detect` |
| `e4:payment:overdue-escalate` | `payment:overdue:escalate` |

### Export graf (v2)

- **5** neuroni; exemple: `payment:reconcile:auto`, `payment:refund:process`, `reconcile:daily:unmatched`, `reconcile:overdue:check`, `webhook:revolut:ingest`.

### Reconciliere

- Graf: `webhook:revolut:ingest` vs runtime `revolut:webhook:ingest` — **ordine câmpuri inversată**, același literal segment.
- Graf: `payment:refund:process`, `reconcile:daily:unmatched` — `refund` în registry este sub `revolut:refund:process`; `reconcile:daily:unmatched` **nu** în `QUEUES` la audit. **Gap**.

## Decizie de guvernanță familială

1. **Proprietar:** E4 Finance.
2. **Capabilitate:** încasări aliniate comenzi.
3. **Telemetrie:** **CRITICAL** pe nepotriviri reconciliere.

## Research extern

- API Revolut Business (rate limits menționate în comentariu registry): verificare documentație furnizor la data lucrului.

## Limită evidență

- `reconcile:daily:unmatched`: sursă (graf vs cron): neconfirmată.
