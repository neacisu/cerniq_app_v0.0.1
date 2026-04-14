# Sinapsă `quota-guardian-reset-outreach-wa-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `quota-guardian-reset-outreach-wa-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/quota-guardian-reset/quota-guardian-reset-outreach-wa-send.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `quota-guardian-reset` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `quota-guardian-reset` | **Contract:** [`../../../neurons/E2/quota--guardian--reset.md`](../../../neurons/E2/quota--guardian--reset.md). **Triplă autoritate:** v2 **`quota:guardian:reset`**; runtime **`e2:quota:guardian-reset`**. |
| Destinație (graf) | `outreach-wa-send` | **Contract:** [`../../../neurons/E2/outreach--wa--send.md`](../../../neurons/E2/outreach--wa--send.md). [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) rând **95** (`queue_in_registry`: **no**). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **quota-guardian-reset** depinde canonic de **outreach-wa-send**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `quota-guardian-reset` → `outreach-wa-send`.
- **Semantic:** ambele **E2**.
- **Runtime:** sursa are mapare registry în matrice; pentru țintă vezi gap — vezi contracte neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`quota-guardian-reset-outreach-wa-send\``.
