<!-- neuron-contract:author-complete -->

# Neuron `graph:kol:identify`

> **Status:** audit manual **2026-04-13**. **v2** coadă `graph:kol:identify` (L8476–8499) — rutare LLM + Tier 3. **Runtime:** coadă **`kol:identify`** (L561), worker **`d23-kol-identify.ts`**: logică **deterministă** (formulă scor L42–48, praguri eligibilitate L52–54, tier EMERGING/ESTABLISHED/ELITE L57–62), **fără** apel LLM în fișierul citit. **Catalog** descriere L2967 menționează „NPS ≥ 8 → tier micro/macro/mega” — **nu** apare în implementarea D23 citită (tier-uri diferite). **Bootstrap:** D23 **nu** în `index.ts` L68–91.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:kol:identify` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--kol--identify.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2:** identificare KOL cu routing model și prag încredere. **Cod:** scoring din metrici de centralitate + upsert `gold_kol_profiles` (d23 L112+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8476–8499).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:kol:identify` (L2964–2971).
- `workers/shared/src/queue-registry.ts` — `E5_KOL_IDENTIFY` (L561).
- `workers/e5-nurturing/src/workers/d23-kol-identify.ts` — `withCognitiveSpan("e5:kol:identify", …)` (L89); formule L42–62.
- `workers/e5-nurturing/src/lib/e5-metrics.ts` — `cerniq_e5_kol_profiles_total` (L129–134).

## Instanțe v2

- —

## N/A pe criterii

- — (v2 prevede rutare LLM — **8 se aplică la v2**; la cod: **AI N/A** efectiv).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`kol:identify`** (L561); `e5:kol:identify` (L2965–2966). Prefix v2 **`graph:`** (L8493). | v2 L8493. | Prefix diferit. |
| 2 | Etapă, familie, swimlane | `AssociativeNeuron`, **`graph-community`** (L2968–2969). | v2 L8478–8486. | — |
| 3 | Rol declarat | Scor + tier EMERGING/ESTABLISHED/ELITE (d23 L7–16, L57–62). | Catalog L2967 (NPS, micro/macro/mega); v2 L8490–8491. | **Catalog și cod D23 diverg** pe tier-uri și criterii. |
| 4 | NeuronType + SOFAI | `AssociativeNeuron` (L2968). | v2 `AssociativeNeuron` (L8484). | — |
| 5 | Criticitate | Catalog **`HIGH`** (L2971). | v2 **`HIGH`** (L8487). | — |
| 6 | Înveliș telemetrie | `e5:kol:identify` (L89). | v2 `cognitive.e5.kol.identify` (L8498). | Aliniere bună pe segment `e5.kol.identify`. |
| 7 | Înveliș politică | — | v2 Tier 3, HITL anomalii (L8488–8496). | Cod D23 fără HITL explicit în fișierul citit. |
| 8 | Rutare model (dacă AI) | **Cod:** determinist, fără LLM. | v2 PRIMARY vllm / SGLang (L8495). | **v2 ≠ implementare D23.** |
| 9 | Guardrails | Praguri numerice în cod (L52–62). | NeMo + guardrails v2. | — |
| 10 | Escaladare HITL | — | v2 obligatoriu la anomalii (L8496). | — |
| 11 | Micro-OODA | Input `topNodes` de la D22 → UPSERT profiluri. | v2 L8494. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L8488). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + Drizzle; gauge `e5_kol_profiles_total`. | — | — |

### Mapare OTel

- **v2:** `cognitive.e5.kol.identify`.
- **Cod:** `e5:kol:identify`.

---
*Audit manual 2026-04-13; surse verificate în repo.*
