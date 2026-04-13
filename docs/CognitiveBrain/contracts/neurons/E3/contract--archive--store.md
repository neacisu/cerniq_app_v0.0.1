<!-- neuron-contract:author-complete -->

# Neuron `contract:archive:store`

> **Status:** audit manual **2026-04-13**. v2 `Confirmed queue field` = `contract:archive:store`; **runtime** = `document:archive:store`, `nodeKey` = `e3:document:archive-store` (I55). Etapa **E3** (v2 L6443–6466); descrierea „E4” din unele propoziții v2 este **contradictorie** cu `Stage: E3` din același bloc — contractul urmează **E3**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `contract:archive:store` |
| coadă runtime | `document:archive:store` |
| etapa | E3 |
| familie (v2) | `contracts` |
| contract_path | `contracts/neurons/E3/contract--archive--store.md` |
| ADR familie (indicativ) | [fiscal-docs](../../adr/families/e3/fiscal-docs.md) |

## Scop în context real

Arhivare documente fiscale Oblio cu lanț hash SHA-256 (`fiscal_audit_trail`), retenție declarată 10 ani, conținut trimis ca string în job; stocare obiect marcată în cod ca fază viitoare (`object-storage-phase-14` în datele de audit).

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L6443–6466.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e3:document:archive-store` (~L2000–2007).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E3_DOCUMENT_ARCHIVE_STORE` (~L302).
- Handler: [`workers/e3-ai-sales/src/workers/i55-document-archive-store.ts`](../../../../../workers/e3-ai-sales/src/workers/i55-document-archive-store.ts).
- Mapare workeri E3: [`workers/e3-ai-sales/src/main.ts`](../../../../../workers/e3-ai-sales/src/main.ts) — cheie `"document:archive:store"` ~L239.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `contracts` (v2 L6443–6466)

- **Catalog nodeKey:** `e3:document:archive-store`
- **Neuron type:** `MotorNeuron`
- **Swimlane:** `fiscal-execution`
- **Criticitate:** HIGH
- **Autonomy tier (v2):** Tier 3
- **OODA (v2):** OBSERVE → ORIENT → DECIDE → ACT (comandă send/execute)
- **Model routing:** Non-AI
- **OTel span (v2):** `cognitive.e3.document.archive-store`
- **Evidence status:** catalog-grounded

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI (v2 L6462).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă: `document:archive:store`. `nodeKey`: `e3:document:archive-store`. v2 etichetă: `contract:archive:store`. | v2 L6450, L6460. | Dublă denumire coadă (contract vs document). |
| 2 | Etapă, familie, swimlane | Catalog: etapa 3, swimlane `fiscal-execution`. Worker în pachet `e3-ai-sales`. | v2: E3, familie `contracts`, swimlane `fiscal-execution`. | — |
| 3 | Rol declarat | Hash SHA-256, chain `GENESIS`/prev, INSERT audit (i55 ~L72–100+). | v2 L6457–6459. | Comentariu i55 L8–9 menționează `ComplianceNeuron` — **nu** e tipul din catalog. |
| 4 | NeuronType + SOFAI | `MotorNeuron` în catalog. | v2 L6451 — MotorNeuron. | — |
| 5 | Criticitate | `HIGH` în catalog (~L2007). | v2 L6454. | — |
| 6 | Înveliș telemetrie | i55 **nu** folosește `withCognitiveSpan` în fișierul citit. | v2 L6465 — span punctuat. | Span per-neuron: neimplementat pe I55 la audit. |
| 7 | Înveliș politică | Validare tip document INVOICE/PROFORMA/CREDIT_NOTE (i55 ~L65–69). | v2 L6455, L6463. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Hash chain determinist; refuz documente invalide. | v2 — integritate. | — |
| 10 | Escaladare HITL | Neobservat în i55; erori → throw. | v2 L6463. | — |
| 11 | Micro-OODA | Verificare document → hash → scriere audit (i55). | v2 L6461. | — |
| 12 | Tier + de-escaladare | Fără prag încredere. | v2 Tier 3. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E3, Drizzle, crypto `node:crypto`. | Obiect storage: țintă (comentariu i55). | — |

### Mapare OTel

- **v2:** `cognitive.e3.document.archive-store`.
- **Cod:** fără `withCognitiveSpan` pe I55; convenția helper ar folosi `cognitive:${nodeKey}` cu `nodeKey` = `e3:document:archive-store` pentru aliniere viitoare.

---
*Audit manual 2026-04-13.*
