# Sinapsă `enrich-anaf-address-enrich-ai-text-structure`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anaf-address-enrich-ai-text-structure` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anaf-address/enrich-anaf-address-enrich-ai-text-structure.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anaf-address` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-anaf-address` | **Contract:** [`../../../neurons/E1/enrich--anaf--address.md`](../../../neurons/E1/enrich--anaf--address.md). |
| Destinație (graf) | `enrich-ai-text-structure` | **Contract (neuron):** [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). **ADR:** [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). **Traseu sinapse:** [`../enrich-ai-text-structure/`](../enrich-ai-text-structure/). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **enrich-anaf-address** depinde de **enrich-ai-text-structure**. v2: **„sinapsă canonică de pipeline”**. Neuronul țintă indică **potrivire semantică** spre J1 / **`ai:structure:xai`** fără mapare formală nume v2 ↔ coadă — se raportează aici ca **reconciliere**, nu ca fapt din registrul sinapsei.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Runtime (ADR-0001):** `ai:structure:xai` ca apropiere citată în neuron țintă; verificare în `queue-registry.ts`.
- **Semantic (ADR-0002):** `e1:ai:structure-xai` — catalog (vezi neuron).
- **Planificare:** v2 §7 — `enrich-anaf-address` → `enrich-ai-text-structure`.

## Limite și reconcilieri

- Muchia **nu** afirmă că ANAF adresă și J1 partajează același job sau payload.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anaf-address-enrich-ai-text-structure\``.
