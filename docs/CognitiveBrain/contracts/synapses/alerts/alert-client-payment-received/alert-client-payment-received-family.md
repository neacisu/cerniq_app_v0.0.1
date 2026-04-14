# Sinapsă `alert-client-payment-received-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-client-payment-received-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-client-payment-received/alert-client-payment-received-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-client-payment-received` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-client-payment-received` | Traseu în graf; **Matrix:** coadă v2 `alert:client:payment-received` (E4, `alerts`) — [`../../../neurons/E4/alert--client--payment-received.md`](../../../neurons/E4/alert--client--payment-received.md). Contractul neuron: **gap** față de registry pentru coada granulară; în runtime apar cozi generice `alert:payment` … `alert:dispatch` (`QUEUES.E4_ALERT_*` în `workers/shared/src/queue-registry.ts`, ex. L463–473). |
| Destinație (graf) | `e4-alerts` | Nod agregat de familie **alerts** E4 în planificare; nu este o singură coadă BullMQ și nu există contract neuron unic pentru această etichetă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **default** cu descrierea **„specializează familia”** ancorează traseul de alertă „plată primită (client)” în nucleul `e4-alerts` din graf. v2 §7 nu definește payload sau ordinea față de alte alerte; reconcilierea la cozi reale trece prin contractul neuron sursă și prin infrastructura generică I39–I44, nu prin câmpurile sinapsei.

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

- **Runtime (ADR-0001):** pentru `alert:client:payment-received`, **nu** există intrare 1:1 în `queue-registry.ts` la auditul din contractul neuron; pentru alerte E4 implementate, vezi constantele `E4_ALERT_*`. Pentru `e4-alerts`, doar planificare agregată.
- **Semantic (ADR-0002):** `e4:alert:*` în catalog pentru cozile generice; **fără** `nodeKey` pentru coada granulară v2 — vezi contractul neuron.
- **Planificare:** muchie de specializare familie în graf.

## Limite și reconcilieri

- Granularitate v2 vs cozi `alert:*` runtime — documentată în contractul neuron; această sinapsă nu o rezolvă.
- Fără completări inventate pentru payload/retry/safety/telemetrie per-muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — **7. Complete synapse contract register**, bloc `SYNAPSE \`alert-client-payment-received-family\``.
