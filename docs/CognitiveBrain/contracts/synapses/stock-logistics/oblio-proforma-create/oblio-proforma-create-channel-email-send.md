# Sinapsă `oblio-proforma-create-channel-email-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `oblio-proforma-create-channel-email-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/oblio-proforma-create/oblio-proforma-create-channel-email-send.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `oblio-proforma-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `oblio-proforma-create` | **Contract:** [`../../../neurons/E3/oblio--proforma--create.md`](../../../neurons/E3/oblio--proforma--create.md). **Triplă autoritate:** v2 `oblio:proforma:create`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `channel-email-send` | **Contract:** [`../../../neurons/E3/channel--email--send.md`](../../../neurons/E3/channel--email--send.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **oblio-proforma-create** are dependență canonică de pipeline față de **channel-email-send**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `oblio-proforma-create` → `channel-email-send`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L140**; **Destinație (coadă):** `channel:email:send` la **L130**.
- **Runtime:** vezi neuronii.

## Limite și reconcilieri

- Legătura temporală între emiterea proformei și trimiterea email nu este în câmpurile SYNAPSE.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`oblio-proforma-create-channel-email-send\``.
