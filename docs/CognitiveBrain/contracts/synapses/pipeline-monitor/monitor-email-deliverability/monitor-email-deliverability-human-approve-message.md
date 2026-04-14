# Sinapsă `monitor-email-deliverability-human-approve-message`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `monitor-email-deliverability-human-approve-message` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/monitor-email-deliverability/monitor-email-deliverability-human-approve-message.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `monitor-email-deliverability` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `monitor-email-deliverability` | **Contract:** [`../../../neurons/E2/monitor--email--deliverability.md`](../../../neurons/E2/monitor--email--deliverability.md). **Triplă autoritate:** v2 `monitor:email:deliverability`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `human-approve-message` | **Contract:** [`../../../neurons/E2/human--approve--message.md`](../../../neurons/E2/human--approve--message.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **monitor-email-deliverability** are dependență canonică de pipeline față de **human-approve-message** (flux HITL: aprobare mesaj). v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `monitor-email-deliverability` → `human-approve-message`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L84**; **Destinație (coadă):** `human:approve:message` la **L75**.
- **Runtime:** vezi neuronii; alinierea slug graf (`human-approve-message`) ↔ `human:approve:message` este cea din matrice/contracte.

## Limite și reconcilieri

- Orice detaliu despre ordinea efectivă a joburilor HITL față de monitorizare trebuie dovedit din cod sau specificații operaționale — nu din exportul de muchie singur.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`monitor-email-deliverability-human-approve-message\``.
