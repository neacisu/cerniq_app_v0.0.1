# ADR-0004 — Direcție „event spine”

| Câmp | Valoare |
| --- | --- |
| ID | ADR-0004 |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Nivel | Global |
| Plan v2 | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §3 «ADR-0004 — Event spine direction» |
| Plan legacy | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — reconciliere streaming |
| Research | [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) — Kafka + BullMQ ca nerv dublu |
| Fișiere autoritate | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts), [workers/e4-postsale/src/workers/c13-credit-profile-create.ts](../../../../workers/e4-postsale/src/workers/c13-credit-profile-create.ts), [workers/shared/src/cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts), [apps/api/src/routes/cognitive-brain.ts](../../../../apps/api/src/routes/cognitive-brain.ts) |

## Context

Arhitectura țintă separă **execuția joburilor** de **fluxul de evenimente** durabil între servicii. Trebuie declarat ce este **implementat** în repo față de ce rămâne **direcție** în v2.

## Decizie (canonică din v2)

- **BullMQ** rămâne substratul de **execuție** (ingest job, rate limit, retry, priorități, DAG `FlowProducer`, procesori).
- **Apache Kafka** (versiune și topic naming în v2) este **coloana de streaming** țintă pentru evenimente cognitive inter-servicii, cu pattern «consumer Kafka → enqueue BullMQ → worker → emit înapoi».
- **Consecință:** execuția și streaming-ul sunt straturi distincte; Kafka aduce durabilitate/replay; BullMQ aduce managementul joburilor.

## Dovezi în implementarea Cerniq

### BullMQ — confirmat

- Versiune monorepo: `bullmq` **5.73.3** în [package.json](../../../../package.json) — v2 menționează **5.73.4** (reconciliere ca la ADR-0001).
- Registry și înregistrare cozi: [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts).
- **FlowProducer** (DAG parent/child): [workers/e4-postsale/src/workers/c13-credit-profile-create.ts](../../../../workers/e4-postsale/src/workers/c13-credit-profile-create.ts), [credit-refresh-all.ts](../../../../workers/e4-postsale/src/workers/credit-refresh-all.ts), comentarii arhitectură C13–C17.

### Evenimente cognitive (Redis + DB + SSE) — strat aplicativ actual

- [workers/shared/src/cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts) — `emitCognitiveEvent` persistă în `cognitiveEvents` și publică pe Redis când există `tenantId`; contract documentat în fișier.
- [apps/api/src/routes/cognitive-brain.ts](../../../../apps/api/src/routes/cognitive-brain.ts) — `GET /api/v1/brain/events/stream` (SSE), consum Redis / replay din DB.

### Kafka — neconfirmat ca runtime în repo

- [docs/developer-guide/testing-coverage-tiers.json](../../../developer-guide/testing-coverage-tiers.json) — rațiune explicită: la audit **nu** există producător/consumator Kafka în cod.
- Nu s-a găsit client Kafka tipic în `*.ts` la căutările din sesiunea de audit (aprilie 2026).

## Aliniere la cercetare

Research-ul plasează **Kafka + BullMQ** complementar; **implementarea curentă** confirmă BullMQ + Redis/Postgres pentru firul cognitive UI; Kafka rămâne **direcție arhitecturală** din v2.

## Reconciliere v2 ↔ cod

| Element v2 | Stare în repo (audit2026-04-11) |
| --- | --- |
| Topic naming `cognitive.{stage}.{event_type}.v1` | **Direcție v2**; fără implementare verificată în cod. |
| Kafka 4.1 / client Confluent JS | **Direcție v2**; fără dependență Kafka în `package.json` verificată. |
| Bridge «Kafka → BullMQ» | **Direcție v2**; fără evidență în cod. |
| BullMQ (execuție, FlowProducer) | **Implementat** (vezi E4 credit). |

## Consecințe operaționale

1. Introducerea Kafka impune ADR de migrare și actualizarea acestui document cu **dovezi** (module client, topic-uri, contracte).
2. Până atunci, «event spine» operațional pentru brain UI rămâne **Postgres + Redis + SSE**, nu Kafka.

## Criterii de acceptanță (documentare)

- [ ] Primul commit cu client Kafka — actualizare ADR-0004 cu fișiere și topic-uri.
- [ ] Diagramă bridge Kafka–BullMQ când devine reală.

## Surse externe

- **Apache Kafka — documentație:** [https://kafka.apache.org/documentation/](https://kafka.apache.org/documentation/) — verificat la **2026-04-11** (context produs streaming; nu înlocuiește dovada integrării în repo).
- **BullMQ — Flows:** [https://docs.bullmq.io/guide/flows](https://docs.bullmq.io/guide/flows) — verificat la **2026-04-11**.

## Limită evidență

- Configurații cluster Kafka, Share Groups (KIP-932) și versiuni exacte de broker **nu** sunt validate din acest repo.
- Detalii `removeOnComplete` / `removeOnFail` din v2 nu sunt extrase linie-cu-linie din fiecare worker.

## Legături

- ADR-0001, ADR-0003, ADR-0008; [README Cognitive Brain](../../README.md).
