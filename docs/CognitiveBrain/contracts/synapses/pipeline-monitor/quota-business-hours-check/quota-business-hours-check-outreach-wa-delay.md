# Sinapsă `quota-business-hours-check-outreach-wa-delay`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `quota-business-hours-check-outreach-wa-delay` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/quota-business-hours-check/quota-business-hours-check-outreach-wa-delay.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `quota-business-hours-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `quota-business-hours-check` | **Contract:** [`../../../neurons/E2/quota--business-hours--check.md`](../../../neurons/E2/quota--business-hours--check.md). **Triplă autoritate:** v2 **`quota:business-hours:check`**; runtime **`e2:quota:business-hours`**. |
| Destinație (graf) | `outreach-wa-delay` | **Contract:** [`../../../neurons/E2/outreach--wa--delay.md`](../../../neurons/E2/outreach--wa--delay.md). **Triplă autoritate:** v2 **`outreach:wa:delay`**; [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) rând **93**; coloane registry: **`queue_in_registry` = no** pentru acest rând — vezi neuron pentru gap. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **quota-business-hours-check** depinde canonic de **outreach-wa-delay** (întârziere / reprogramare la nivel de flux WhatsApp outreach). v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `quota-business-hours-check` → `outreach-wa-delay`.
- **Semantic:** ambele **E2**; ținta în **orchestrator** (matrice).
- **Runtime:** reconciliere graf ↔ registry **parțială** pentru țintă — vezi contract neuron `outreach--wa--delay.md` și matrice rând **93**.

## Limite și reconcilieri

- Prezența muchiei în graf **nu** implică singură o coadă înregistrată în `queue-registry.ts` pentru țintă; dovada este în matrice / neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`quota-business-hours-check-outreach-wa-delay\``.
