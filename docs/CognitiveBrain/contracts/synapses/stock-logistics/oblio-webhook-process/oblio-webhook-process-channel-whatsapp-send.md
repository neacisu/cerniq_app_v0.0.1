# Sinapsă `oblio-webhook-process-channel-whatsapp-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `oblio-webhook-process-channel-whatsapp-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/oblio-webhook-process/oblio-webhook-process-channel-whatsapp-send.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `oblio-webhook-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `oblio-webhook-process` | **Contract:** [`../../../neurons/E3/oblio--webhook--process.md`](../../../neurons/E3/oblio--webhook--process.md). **Triplă autoritate:** v2 `oblio:webhook:process`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `channel-whatsapp-send` | **Contract:** [`../../../neurons/E3/channel--whatsapp--send.md`](../../../neurons/E3/channel--whatsapp--send.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **oblio-webhook-process** are dependență canonică de pipeline față de **channel-whatsapp-send**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `oblio-webhook-process` → `channel-whatsapp-send`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L142**; țintă `channel:whatsapp:send` la **L132**.
- **Runtime:** vezi neuronii.

## Limite și reconcilieri

- Nu se afirmă din export ce tip de mesaj WhatsApp urmează unui anumit tip de eveniment webhook; doar dependența structurală.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`oblio-webhook-process-channel-whatsapp-send\``.
