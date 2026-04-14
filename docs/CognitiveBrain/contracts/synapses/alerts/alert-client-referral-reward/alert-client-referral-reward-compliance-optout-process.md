# Sinapsă `alert-client-referral-reward-compliance-optout-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-client-referral-reward-compliance-optout-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-client-referral-reward/alert-client-referral-reward-compliance-optout-process.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-client-referral-reward` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-client-referral-reward` | **Matrix:** `alert:client:referral-reward` — [`../../../neurons/E5/alert--client--referral-reward.md`](../../../neurons/E5/alert--client--referral-reward.md). **Gap** registry pentru coada granulară. |
| Destinație (graf) | `compliance-optout-process` | **Matrix:** `compliance:optout:process` — [`../../../neurons/E5/compliance--optout--process.md`](../../../neurons/E5/compliance--optout--process.md). **Repo:** fără coadă/worker dedicat cu acest literal; comportamente înrudite în outreach (email/SMS/WA) — vezi contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența plasează alertarea de **recompensă referral** în raport cu **procesarea opt-out** din graf. v2: **„sinapsă canonică de pipeline”**. Interpretare conservatoare: planificarea cere poziție canonică față de retragerea consimțământului; runtime-ul actual nu expune o singură coadă `compliance:optout:process`.

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

- **Runtime (ADR-0001):** **fără** mapare 1:1 în registry pentru destinație; sursă alertă — gap.
- **Semantic (ADR-0002):** span v2 `cognitive.compliance.optout.process` — vezi neuron.
- **Planificare:** dependență structurală; implementarea este **necesită reconciliere graf ↔ cod**.

## Limite și reconcilieri

- Opt-out dispersat în workeri E2/outreach vs nod unic în graf — documentat în contractul neuron; sinapsa nu unifică aceste căi.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-client-referral-reward-compliance-optout-process\``.
