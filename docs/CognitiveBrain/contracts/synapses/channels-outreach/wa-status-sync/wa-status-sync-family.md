# Sinapsă `wa-status-sync-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-status-sync-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-status-sync/wa-status-sync-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-status-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `wa-status-sync` | **Contract:** [`../../../neurons/E2/wa--status--sync.md`](../../../neurons/E2/wa--status--sync.md). **Runtime (ADR-0001):** `QUEUES.WA_STATUS_SYNC` → `wa:status:sync` — vezi contract neuron. |
| Destinație (graf) | `e2-whatsapp` | **Nod agregat:** familia **whatsapp** E2. **ADR:** [`../../../../adr/families/e2/whatsapp.md`](../../../../adr/families/e2/whatsapp.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează **`wa-status-sync`** (sincronizare status conturi WA) sub agregatul **`e2-whatsapp`**. v2: **„specializează familia”**.

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

- **Runtime:** sursa are coadă în registry; `e2-whatsapp` nu este cheie `QUEUES`.
- **Semantic:** `e2:wa:status-sync` — catalog.
- **Planificare:** v2 §7 — `wa-status-sync` → `e2-whatsapp`.

## Limite și reconcilieri

- Contractul sursă notează limită privind producătorul periodic de job-uri — muchia de familie nu o rezolvă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-status-sync-family\``.
