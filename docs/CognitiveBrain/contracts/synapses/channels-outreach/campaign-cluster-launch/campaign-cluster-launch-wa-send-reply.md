# Sinapsă `campaign-cluster-launch-wa-send-reply`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `campaign-cluster-launch-wa-send-reply` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/campaign-cluster-launch/campaign-cluster-launch-wa-send-reply.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `campaign-cluster-launch` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `campaign-cluster-launch` | **Contract:** [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). **Runtime:** vezi contract neuron sursă. |
| Destinație (graf) | `wa-send-reply` | **Contract:** [`../../../neurons/E5/wa--send--reply.md`](../../../neurons/E5/wa--send--reply.md). **Runtime:** reconciliere graf vs cozi WA (inclusiv `q:wa:reply` legacy / per-telefon) — vezi contract neuron; **nu** presupune o singură coadă fără citire. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Lansarea clusterului** depinde în planificare de **capacitatea de răspuns WhatsApp**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie thread-uri, SLA sau conținut mesaj.

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

- **Runtime (ADR-0001):** vezi `queue-registry.ts` pentru cozi WA și notele din [`../../../neurons/E5/wa--send--reply.md`](../../../neurons/E5/wa--send--reply.md).
- **Semantic (ADR-0002):** conform contractului neuron țintă.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- La fel ca pentru `wa-send-initial`: poziția în graf (E5 în v2 pentru instanța documentată la neuron) poate diferi de **stack-ul efectiv** de procesare — vezi fișier neuron.
- Sursa `campaign-cluster-launch` — vezi posibil gap.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`campaign-cluster-launch-wa-send-reply\``.
