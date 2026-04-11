# ADR-FAMILY-e2-webhooks

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-webhooks |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `webhooks` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-webhooks` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Ingestie evenimente din furnizori externi (TimelinesAI, Instantly, Resend) și normalizare payload.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e2:webhook:timelinesai` | `webhook:timelinesai:ingest` |
| `e2:webhook:instantly` | `webhook:instantly:ingest` |
| `e2:webhook:resend` | `webhook:resend:ingest` |
| `e2:webhook:normalize` | `webhook:normalize` |

- Registry: `WEBHOOK_*` — aceleași string-uri.

### Export graf (v2)

- **3** neuroni; exemple: `webhook:instantly:ingest`, `webhook:resend:ingest`, `webhook:timelinesai:ingest` (**fără** `webhook:normalize` în listă).

### Reconciliere

- Coada `webhook:normalize` există în runtime și catalog dar **nu** în exemplele graf v2 — nod suplimentar în implementare.

## Decizie de guvernanță familială

1. **Proprietar:** Outreach Integrations.
2. **Capabilitate:** intrare evenimente cu semnătură / validare (detaliu în worker).
3. **Telemetrie:** **HIGH** — I/O extern.
4. **Anomalii:** replay flood, payload malformat.

## Limită evidență

- Schema normalizată comună: din cod ingest.
