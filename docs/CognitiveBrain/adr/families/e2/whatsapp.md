# ADR-FAMILY-e2-whatsapp

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-whatsapp |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `whatsapp` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-whatsapp` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

WhatsApp pentru outreach: cozi non-per-telefon, cozi per telefon generate (`q:wa:phone-XX`, followup), legacy `q:wa:reply`.

## Dovezi confirmate în Cerniq

### Catalog (non-per-phone)

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e2:wa:reply` | `q:wa:reply` |
| `e2:wa:message-retry` | `wa:message:retry` |
| `e2:wa:chat-history` | `wa:chat:history:fetch` |
| `e2:wa:status-sync` | `wa:status:sync` |
| `e2:wa:media-send` | `wa:media:send` |

### Registry — suplimentar

- `WA_DELIVERY_STATUS` = `wa:delivery:status`, `WA_READ_RECEIPT` = `wa:read:receipt` — **nu** toate mapate 1:1 în snippet-ul catalog citat; verificare catalog pentru `e2:wa:*` complete.

### Per-telefon

- [queue-registry.ts](../../../../workers/shared/src/queue-registry.ts): `getWaPhoneQueueName`, `getWaPhoneFollowupQueueName`, `WA_PHONE_COUNT = 20` → **40** config-uri (principal + followup), concurență **1** per coadă (ADR-0060 în comentariu).

### Export graf (v2)

- **13** neuroni; exemple pattern `q:wa:phone_*`, `q:wa:reply`.

### Reconciliere

- Pattern graf `q:wa:phone_` vs implementare `q:wa:phone-01` (cu cratimă) — convenție denumire în v2 este ilustrativă; autoritatea este **funcțiile** `getWaPhoneQueueName`.

## Decizie de guvernanță familială

1. **Proprietar:** Outreach E2.
2. **Capabilitate:** livrare WA cu izolare HOL per telefon.
3. **Telemetrie:** status delivery și read receipt.
4. **Anomalii:** blocare număr, rate limit provider.

## Limită evidență

- Mapare completă catalog ↔ `wa:delivery:status` / `wa:read:receipt`: verificare fișier catalog integral.
