# Sinapsă `alert-client-referral-reward-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-client-referral-reward-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-client-referral-reward/alert-client-referral-reward-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-client-referral-reward` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-client-referral-reward` | Traseu în graf; **Matrix:** coadă v2 `alert:client:referral-reward` (E5, `alerts`) — [`../../../neurons/E5/alert--client--referral-reward.md`](../../../neurons/E5/alert--client--referral-reward.md). **Gap** registry: literalul **nu** apare în `queue-registry.ts` la auditul neuronului; vezi ADR `e5/alerts.md`. |
| Țintă | `e5-alerts` | Nod agregat de familie **alerts** E5 în planificare; nu este o singură coadă BullMQ și nu există contract neuron unic pentru această etichetă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **default** cu descrierea **„specializează familia”** ancorează traseul de alertă **recompensă referral (client)** în nucleul `e5-alerts` din graf. v2 §7 nu definește payload sau ordinea față de alte alerte; reconcilierea la runtime trece prin contractul neuron sursă și prin ADR-ul familiei, nu prin câmpurile sinapsei.

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

- **Runtime (ADR-0001):** pentru `alert:client:referral-reward`, **nu** există intrare dedicată în registry la auditul din contractul neuron. Pentru `e5-alerts`, doar planificare agregată.
- **Semantic (ADR-0002):** vezi gap-uri în contractul neuron; fără `nodeKey` pentru coada granulară v2.
- **Planificare:** muchie de specializare familie în graf.

## Limite și reconcilieri

- Graf `alert:client:*` vs cozi operaționale E5 — documentat în ADR; această sinapsă nu impune mapare 1:1.
- Fără completări inventate pentru payload/retry/safety/telemetrie per-muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — **7. Complete synapse contract register**, bloc `SYNAPSE \`alert-client-referral-reward-family\``.
