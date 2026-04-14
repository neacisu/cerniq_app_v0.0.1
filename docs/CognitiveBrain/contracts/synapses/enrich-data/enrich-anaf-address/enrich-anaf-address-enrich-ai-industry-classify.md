# Sinapsă `enrich-anaf-address-enrich-ai-industry-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anaf-address-enrich-ai-industry-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anaf-address/enrich-anaf-address-enrich-ai-industry-classify.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anaf-address` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-anaf-address` | **Contract:** [`../../../neurons/E1/enrich--anaf--address.md`](../../../neurons/E1/enrich--anaf--address.md). |
| Destinație (graf) | `enrich-ai-industry-classify` | **Contract (neuron):** [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). **ADR:** [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). **Traseu sinapse:** [`../enrich-ai-industry-classify/`](../enrich-ai-industry-classify/). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **enrich-anaf-address** depinde de **enrich-ai-industry-classify**. v2: **„sinapsă canonică de pipeline”**. Contractul neuron țintă notează **lipsă** implementării izolate cu coada v2 și **aproximări semantice** (ex. J1, L4) — muchia rămâne ancorată în **topologia grafului**, nu în aceste potriviri.

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

- **Runtime (ADR-0001):** vezi neuron țintă — fără `enrich:ai:industry-classify` literal în registry.
- **Semantic (ADR-0002):** AI enrichment E1 — catalog / ADR.
- **Planificare:** v2 §7 — `enrich-anaf-address` → `enrich-ai-industry-classify`.

## Limite și reconcilieri

- Nu confunda această muchie cu extragerea CAEN din D0 ANAF full; neuronul țintă discută explicit despre **decalaj** față de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anaf-address-enrich-ai-industry-classify\``.
