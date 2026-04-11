# ADR-FAMILY-e2-email-warm

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-email-warm |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `email-warm` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-email-warm` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **email-warm** acoperă email transacțional / relațional (Resend): trimitere generală, proformă, document.

## Dovezi confirmate în Cerniq

### În cod și registry

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e2:email:warm-send` | `q:email:warm` |
| `e2:email:warm-proforma` | `email:warm:proforma` |
| `e2:email:warm-document` | `email:warm:document` |

- Registry: `EMAIL_WARM`, `EMAIL_WARM_PROFORMA`, `EMAIL_WARM_DOCUMENT`.

### În exportul de graf (v2)

- **3** neuroni; exemple: `email:warm:document`, `email:warm:proforma`, `email:warm:send`.

### Reconciliere

- Graf folosește `email:warm:send`; catalog mapare `e2:email:warm-send` → **`q:email:warm`** (coadă canonică tranzacții warm). Denumire diferită între graf și literal registry pentru „send” — **aceeași funcție**, string diferit (`q:email:warm` vs `email:warm:send`).

## Decizie de guvernanță familială

1. **Proprietar:** Outreach E2.
2. **Capabilitate:** livrare documente comerciale pe canal email warm.
3. **Telemetrie:** **HIGH** (PII în payload-uri — redactare în telemetrie per `cognitive-helpers`).
4. **Anomalii:** eșec Resend, rate limit.

## Contracte și indexare

- [contracts/neurons/](../../contracts/neurons/) — `q:email:warm`, `email:warm:*`.

## Limită evidență

- Handler-level payloads: din worker, nu din v2.
