# Sinapsă `campaign-cluster-launch-wa-send-initial`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `campaign-cluster-launch-wa-send-initial` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/campaign-cluster-launch/campaign-cluster-launch-wa-send-initial.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `campaign-cluster-launch` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `campaign-cluster-launch` | **Contract:** [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). **Runtime:** vezi contract neuron sursă. |
| Destinație (graf) | `wa-send-initial` | **Contract:** [`../../../neurons/E5/wa--send--initial.md`](../../../neurons/E5/wa--send--initial.md). **Reconciliere:** v2 plasează instanța în E5; contractul neuron documentează execuție efectivă pe cozi **E2** `q:wa:phone-*` — vezi fișierul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Lansarea clusterului** depinde în planificare de **trimiterea mesajului WhatsApp inițial**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie index telefon, template sau id conversație.

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

- **Runtime (ADR-0001):** **nu** există coadă unică `wa:send:initial` în registry; vezi `getWaPhoneQueueName` și cozi `q:wa:phone-*` în contract neuron.
- **Semantic (ADR-0002):** etichetă graf vs orchestrare E2 — bifurcație documentată în neuron.
- **Planificare:** dependență declarativă din v2.

## Limite și reconcilieri

- Tripla autoritate: **planificare (graf)** ≠ **runtime (cozi per-telefon)**; sinapsa rămâne ancorată în nodurile v2, iar execuția în contractul neuron.
- Sursa `campaign-cluster-launch` — vezi posibil gap.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`campaign-cluster-launch-wa-send-initial\``.
