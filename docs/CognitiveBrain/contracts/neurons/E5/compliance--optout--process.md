<!-- neuron-contract:author-complete -->

# Neuron `compliance:optout:process`

> **Status:** audit manual **2026-04-13**. **v2** (L7785–L7805): coadă `compliance:optout:process`, `ComplianceNeuron`, E5. **Repo:** **fără** literal în `queue-registry.ts` sau worker dedicat cu acest nume. Căi operaționale înrudite: **email** — `lead_unsubscribed` în `createEmailColdTrackingWorker` (`workers/outreach/src/workers/email.ts`, ramura `case "lead_unsubscribed"`); **SMS** — opt-out STOP în `sms-receive-reply.ts` (comentariu + `errorMessage: "SMS opt-out (STOP)"`); **orchestrare** — `whatsappOptedOut` în `orchestration.ts` (L478+). **Concluzie:** „opt-out” este înglobat în workeri E2/outreach și validări DNC, nu într-o coadă E5 `compliance:optout:process`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `compliance:optout:process` |
| etapa | E5 |
| familie (v2) | `compliance` |
| contract_path | `contracts/neurons/E5/compliance--optout--process.md` |
| ADR familie (indicativ) | [compliance](../../adr/families/e5/compliance.md) |

## Scop în context real

**v2:** procesare evenimente de retragere consimțământ / audit (L7800). **Cod:** actualizări stare lead + flag-uri canal fără enqueue pe o coadă unică „optout” în registry.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7785–L7805.
- `workers/shared/src/queue-registry.ts` — **fără** `optout` în nume cozi.
- `workers/outreach/src/workers/email.ts` — `lead_unsubscribed` (căutare în fișier).
- `workers/outreach/src/workers/sms-receive-reply.ts` — STOP / opt-out.
- `workers/outreach/src/workers/orchestration.ts` — `whatsappOptedOut`.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7785–L7805:** non-AI, span `cognitive.compliance.optout.process` (L7804).

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 non-AI (L7801).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Lipsă** coadă BullMQ `compliance:optout:process`. Evenimente opt-out în workeri outreach (E2). | v2: `compliance:optout:process`. | Graf E5 fără mirror runtime. |
| 2 | Etapă, familie, swimlane | Căi concrete: etapa **2** outreach pentru email/SMS/WA ingest. | v2: E5 `compliance`. | — |
| 3 | Rol declarat | Dezabonare / blocare canal per handler (email tracking, SMS STOP). | v2: procesare opt-out conformitate (L7796–L7798). | — |
| 4 | NeuronType + SOFAI | Workeri outreach: tipuri variate (nu mapate la `ComplianceNeuron` unificat). | v2: `ComplianceNeuron` (L7792). | — |
| 5 | Criticitate | Depinde de flux (bounce/unsubscribe poate declanșa alte cozi). | v2: `MEDIUM` (L7794). | — |
| 6 | Înveliș telemetrie | `createWorker` E2 pe cozi specifice canalului (nu span `cognitive.compliance.optout.process`). | v2 span (L7804). | — |
| 7 | Înveliș politică | GDPR / DNC tratate în logică aplicație. | v2 Tier 4 (L7795), fără HITL obligatoriu (L7802). | — |
| 8 | Rutare model (dacă AI) | **N/A** pentru ramurile opt-out citite (fără LLM). | v2 non-AI. | — |
| 9 | Guardrails | Validare enum evenimente + flag-uri DB. | v2 audit 90 zile (L7802). | — |
| 10 | Escaladare HITL | Posibil indirect (ex. plângeri) — nu dintr-un neuron „optout” izolat. | v2 escaladare în OODA (L7800). | — |
| 11 | Micro-OODA | Eveniment → actualizare log / stare. | v2 OODA (L7800). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ outreach, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.compliance.optout.process`.
- **Cod:** fără span dedicat cu acest nume; instrumentare pe workerii de canal (E2).

---
*Audit manual 2026-04-13.*
