# Sinapsă `enrich-email-discovery-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-email-discovery-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-email-discovery/enrich-email-discovery-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-email-discovery` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-email-discovery` | **v2 / Matrix:** `enrich:email:discovery`. **Contract:** [`../../../neurons/E1/enrich--email--discovery.md`](../../../neurons/E1/enrich--email--discovery.md). **Runtime (ADR-0001):** **`discover:email:hunter`** (`DISCOVER_EMAIL_HUNTER` în `queue-registry.ts`) — **nu** literalul `enrich:email:discovery`. **Catalog:** `e1:discover:email-hunter`. |
| Destinație (graf) | `e1-enrichment` | Agregat **enrichment** E1. **ADR:** [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **descoperire email (Hunter / etichetă graf)** sub **`e1-enrichment`**. v2: **„specializează familia”**. Execuția documentată este pe **`discover:email:hunter`** (G1) — vezi neuron.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime:** `discover:email:hunter` în registry + `main.ts` enrichment.
- **Semantic:** `e1:discover:email-hunter` vs etichetă v2 `enrich:email:discovery`.
- **Planificare:** traseu → `e1-enrichment`.

## Limite și reconcilieri

- Enfileuire din `p1-orchestrate` condiționată de domeniu — vezi contract neuron; nu inferați din sinapsă condițiile complete.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-email-discovery-family\``.
