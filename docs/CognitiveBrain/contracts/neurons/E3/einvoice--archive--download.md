<!-- neuron-contract:author-complete -->

# Neuron `einvoice:archive:download`

> **Status:** audit manual **2026-04-11**. **H49** procesează submissions **VALIDATED** cu `validatedAt`, descarcă ZIP SPV prin Oblio client, hash SHA-256 și lanț audit în `fiscal_audit_trail`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `einvoice:archive:download` |
| etapa | E3 |
| familie (v2) | `fiscal-docs` |
| contract_path | `contracts/neurons/E3/einvoice--archive--download.md` |
| ADR familie (indicativ) | [fiscal-docs](../../adr/families/e3/fiscal-docs.md) |

## Scop în context real

**v2** (L4894–4917): **AutonomicNeuron**, **MEDIUM**, descărcare arhivă ZIP eFactura validată ANAF, **Non-AI**, OODA orientat CRON/maintenance. **Repo:** `workers/e3-ai-sales/src/workers/h49-einvoice-archive-download.ts` — select submissions `status === "VALIDATED"` și `validatedAt` non-null (`h49` L52–66), join `oblioDocuments` pentru serie/număr (`h49` L72–83), `downloadSpvArchive(companyCif, series, number)` (`h49` L94), SHA-256 pe buffer (`h49` L97–98), înregistrare `fiscalAuditTrail` cu `prevHash`/`GENESIS` și `auditHash` din lanț (`h49` L100–129). Comentariu antet: CRON `0 0 * * *`, concurrency 3 (`h49` L2). **Înregistrare:** `main.ts` L232. **Registry:** `QUEUES.E3_EINVOICE_ARCHIVE_DOWNLOAD` (verificat prin `h-workers.test.ts` L107). **Teste:** `h-workers.test.ts` H49 (L746+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`einvoice:archive:download\`` (L4894–4917).
- `packages/shared/src/cognitive-node-catalog.ts` — L1944–1952.
- `workers/shared/src/queue-registry.ts` — `E3_EINVOICE_ARCHIVE_DOWNLOAD` (L289, L989).
- `workers/e3-ai-sales/src/main.ts` — L232.
- `workers/e3-ai-sales/src/workers/h49-einvoice-archive-download.ts`.
- `workers/e3-ai-sales/src/lib/oblio-client.js` — `downloadSpvArchive`.
- `workers/e3-ai-sales/src/__tests__/h-workers.test.ts` — H49.
- `workers/shared/src/factory.ts`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L4913); H49 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:einvoice:archive-download`**, coadă **`einvoice:archive:download`** (`cognitive-node-catalog.ts` L1945–1946). | v2: același `Confirmed queue field` (L4911). | — |
| 2 | Etapă, familie, swimlane | E3; **`fiscal-execution`** (`cognitive-node-catalog.ts` L1949). | v2: fiscal-docs, swimlane fiscal-execution (L4904). | — |
| 3 | Rol declarat | Arhivă SPV + audit trail hash chain (`h49` L4–13, L88–129). | v2: descărcare ZIP validat ANAF (L4908–4910). | Implementare prin **Oblio** `downloadSpvArchive`, nu browser ANAF direct. |
| 4 | NeuronType + SOFAI | **`AutonomicNeuron`** (`cognitive-node-catalog.ts` L1948). | v2: AutonomicNeuron (L4902). | — |
| 5 | Criticitate | **`MEDIUM`** (`cognitive-node-catalog.ts` L1951). | v2: MEDIUM (L4905). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2: `cognitive.e3.einvoice.archive-download` (L4916). | **Parțial aliniat** — `cognitive.nodeKey` vs span v2. |
| 7 | Înveliș politică | Filtru strict VALIDATED + `validatedAt`; lanț audit (`h49` L52–65, L100–129). | v2: Tier 4, HITL la eșecuri repetate (L4906, L4914). | — |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2: Non-AI. | — |
| 9 | Guardrails | Doar submissions validate; hash SHA-256 explicit (`h49` L10–13, L97–119). | ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Nu în H49. | v2 / ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE — submissions + docs; ORIENT — serie/număr; DECIDE — per item; ACT — download + audit insert (`h49` L52–132). | v2 OODA CRON/maintenance (L4912). | Aliniat ca sarcină de fundal. |
| 12 | Tier + de-escaladare | Fără tier în cod. | v2 Tier 4 (L4906). | — |
| 13 | Stack (subset) | BullMQ, Drizzle, `node:crypto`, client Oblio. | v2 §2.3. | Producer CRON: antet `h49` L2 — verificare `queue.add` repeat în afara acestui fișier = limită evidență parțială. |

### Mapare OTel

- **v2:** `cognitive.e3.einvoice.archive-download`.
- **Cod:** `cognitive.nodeKey` **`e3:einvoice:archive-download`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
