# Sinapsă `e1-ai-enrichment-dedup-familyflow`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e1-ai-enrichment-dedup-familyflow` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/familyflow/e1-ai-enrichment-dedup-familyflow.md` |
| Areal sinaptic | `graph-plan` |
| Topologie plan | `familyflow` (contract în `graph-plan/familyflow/`; vezi [`synapses/README.md`](../../../README.md)) |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `e1-ai-enrichment` | Nod **agregat de familie / subgraf** E1 în planificare; **nu** este o coadă unică în `queue-registry.ts` (ADR-0001). |
| Destinație (graf) | `e1-dedup` | Nod agregat E1; mapare 1:1 la un singur `nodeKey` din catalog **nededusă** din această muchie. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful de planificare, familia sursă **`e1-ai-enrichment`** are o legătură **familyflow** de tip **`dependency`** către **`e1-dedup`**. v2: descrierea confirmată este **„alimentează”** — exprimă fluxul de alimentare între familii în topologia exportată, **fără** a fixa payload, ordinea job-urilor sau nume de cozi.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** alimentează
- **Nivel evidență:** graph-export exact field match.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Planificare:** v2 §7 — `e1-ai-enrichment` → `e1-dedup` pe muchie **familyflow** / `dependency`.
- **Runtime (ADR-0001):** etichetele `e1-*` din graf **nu** se echivalează automat cu intrări `QUEUES`; reconcilierea la cozi concrete: [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv), [`queue-registry.ts`](../../../../../../workers/shared/src/queue-registry.ts) și contracte sub `contracts/neurons/`, fără potrivire forțată.
- **Semantic (ADR-0002):** `nodeKey`-urile din `cognitive-node-catalog.ts` descriu neuroni operaționali; agregatele graf pot acoperi **mai mulți** neuroni — **necesită reconciliere graf ↔ catalog**.

## Limite și reconcilieri

- **familyflow vs `-stage` vs `-cross`:** această muchie este **familyflow** (flux între familii în cadrul planului topologic), distinctă de muchiile `-stage` și de punțile `-cross` între familii/etape — vezi registru v2 §7.
- Nu inventa payload, retry, safety sau telemetrie pentru muchie acolo unde v2 marchează absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e1-ai-enrichment-dedup-familyflow\``.
