# Sinapsă `oblio-invoice-cancel-channel-email-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `oblio-invoice-cancel-channel-email-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/oblio-invoice-cancel/oblio-invoice-cancel-channel-email-send.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `oblio-invoice-cancel` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `oblio-invoice-cancel` | **Contract:** [`../../../neurons/E3/oblio--invoice--cancel.md`](../../../neurons/E3/oblio--invoice--cancel.md). **Triplă autoritate:** v2 `oblio:invoice:cancel`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `channel-email-send` | **Contract:** [`../../../neurons/E3/channel--email--send.md`](../../../neurons/E3/channel--email--send.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **oblio-invoice-cancel** are dependență canonică de pipeline față de **channel-email-send** (canal email pentru livrare notificări/conținut). v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `oblio-invoice-cancel` → `channel-email-send`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L138**; țintă `channel:email:send` la **L130**.
- **Runtime:** vezi neuronii; aliniere slug graf `channel-email-send` ↔ `channel:email:send`.

## Limite și reconcilieri

- Conținutul mesajului sau momentul trimiterii față de anularea facturii nu sunt specificate în registrul SYNAPSE; verificare în cod/workflow.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`oblio-invoice-cancel-channel-email-send\``.
