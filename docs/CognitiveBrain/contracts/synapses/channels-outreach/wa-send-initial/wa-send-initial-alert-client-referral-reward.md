# Sinapsă `wa-send-initial-alert-client-referral-reward`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-initial-alert-client-referral-reward` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-initial/wa-send-initial-alert-client-referral-reward.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-initial` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-send-initial` | **`wa:send:initial`** (graf) — [`../../../neurons/E2/wa--send--initial.md`](../../../neurons/E2/wa--send--initial.md); **runtime:** **`q:wa:phone-NN`**. |
| Destinație | `alert-client-referral-reward` | **`alert:client:referral-reward`** — [`../../../neurons/E5/alert--client--referral-reward.md`](../../../neurons/E5/alert--client--referral-reward.md), etapă E5. **Coadă/runtime:** vezi contract neuron — poate lipsi o mapare 1:1 simplă în `queue-registry.ts`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** din plan între **primul mesaj WA (traseu `wa-send-initial`)** și nodul de **alertă referral reward** către client. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie. Semantica operațională E5 — în contractul neuron, nu completată aici.

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

- **Runtime (ADR-0001):** capăt sursă = cozi WA per-telefon; destinație = vezi evidența E5 din neuron.
- **Semantic (ADR-0002):** `NEURON_MATRIX.csv` — rând alert client referral-reward.
- **Planificare:** muchie structurală WA inițial → alertă.

## Limite și reconcilieri

- Traseul sinaptic este **E2 channels-outreach**; ținta este **E5** — strat diferit; reconcilierea runtime se ia din contractele respective, fără presupuneri.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-initial-alert-client-referral-reward\``.
