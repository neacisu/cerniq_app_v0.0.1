<!-- neuron-contract:author-complete -->

# Neuron `oblio:stock:sync`

> **Status:** audit manual **2026-04-11**. **G44** citește `stock_inventory` ca sursă de adevăr, calculează cantități disponibile (total − rezervat), apelează `oblioClient.syncStock` (**STUB**, fără HTTP real). Antet: CRON `*/30 * * * *` — **nu** am găsit `queue.add` repeat în G44; producerul CRON poate fi extern.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `oblio:stock:sync` |
| etapa | E3 |
| familie (v2) | `fiscal-docs` |
| contract_path | `contracts/neurons/E3/oblio--stock--sync.md` |
| ADR familie (indicativ) | [fiscal-docs](../../adr/families/e3/fiscal-docs.md) |

## Scop în context real

**v2** (L4994–5017): **AutonomicNeuron**, **HIGH**, sincronizare stoc Oblio cu intern, **Non-AI**, OODA CRON. **Catalog:** `NeuronType.AutonomicNeuron` (`cognitive-node-catalog.ts` L1901) — **aliniat cu v2** (L5001). **Repo:** `g44-oblio-stock-sync.ts` — select inventar per tenant (`g44` L37–45), filtru SKU non-null (`g44` L52–58), `syncStock` (`g44` L60–61), return `syncedCount` (`g44` L63–67). Comentariu CRON L2–6. **Înregistrare:** `main.ts` L226. **Registry:** `E3_OBLIO_STOCK_SYNC` (`queue-registry.ts` L277). **Teste:** `g-workers.test.ts` G44 (L1113+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`oblio:stock:sync\`` (L4994–5017).
- `packages/shared/src/cognitive-node-catalog.ts` — L1897–1904.
- `workers/shared/src/queue-registry.ts` — L277.
- `workers/e3-ai-sales/src/main.ts` — L226.
- `workers/e3-ai-sales/src/workers/g44-oblio-stock-sync.ts`.
- `workers/e3-ai-sales/src/lib/oblio-client.ts` — `syncStock`.
- `workers/e3-ai-sales/src/__tests__/g-workers.test.ts` — G44.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5013); G44 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:oblio:stock-sync`**, **`oblio:stock:sync`** (`cognitive-node-catalog.ts` L1898–1899). | v2 (L5011). | — |
| 2 | Etapă, familie, swimlane | E3; **`fiscal-execution`** (`cognitive-node-catalog.ts` L1902). | v2 (L4997–5004). | — |
| 3 | Rol declarat | Push cantități către Oblio (stub) din inventar intern (`g44` L4–11, L37–61). | v2 sincronizare după factură / intern (L5008–5009). | «Bidirecțional» din antet G44 L5: **doar outbound spre stub** în cod citit. |
| 4 | NeuronType + SOFAI | **`AutonomicNeuron`** (`cognitive-node-catalog.ts` L1901). | v2 AutonomicNeuron (L5001). | — |
| 5 | Criticitate | **`HIGH`** (`cognitive-node-catalog.ts` L1904). | v2 HIGH (L5005). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2 `cognitive.e3.oblio.stock-sync` (L5016). | **Parțial aliniat**. |
| 7 | Înveliș politică | Izolare tenant `setSessionTenantId` (`g44` L33–35). | v2 Tier 3 (L5006). | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Doar rânduri cu SKU; cantitate ≥ 0 (`g44` L52–58). | ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Nu în G44. | v2 (L5014). | — |
| 11 | Micro-OODA | OBSERVE — inventar; ORIENT — disponibil; ACT — apel stub (`g44` L37–67). | v2 CRON OODA (L5012). | — |
| 12 | Tier + de-escaladare | Fără în cod. | v2 Tier 3 (L5006). | — |
| 13 | Stack (subset) | BullMQ, Drizzle, `oblioClient.syncStock` STUB. | v2 §2.3. | Programare CRON: antet vs **lipsă** `repeat` în G44 — căutare producer altundeva. |

### Mapare OTel

- **v2:** `cognitive.e3.oblio.stock-sync`.
- **Cod:** `cognitive.nodeKey` **`e3:oblio:stock-sync`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
