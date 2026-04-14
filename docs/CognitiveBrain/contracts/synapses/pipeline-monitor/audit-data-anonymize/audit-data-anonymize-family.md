# Sinapsă `audit-data-anonymize-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `audit-data-anonymize-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/audit-data-anonymize/audit-data-anonymize-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `audit-data-anonymize` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `audit-data-anonymize` | Nod de traseu în graf. **Matrix / neuron:** [`../../../neurons/E4/audit--data--anonymize.md`](../../../neurons/E4/audit--data--anonymize.md) — `audit:data:anonymize` (E4, audit). Contractul neuron documentează implementarea **J47** și coada **`audit:data:anonymize`** în `queue-registry.ts`, cu notă despre nealiniere posibilă între string-ul span și cheia din catalog. |
| Destinație (graf) | `e4-audit` | Agregat **familie audit E4** în planificare; nu este o singură coadă executabilă și **nu** există un fișier neuron unic pentru eticheta agregată `e4-audit`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** leagă traseul **audit-data-anonymize** de nucleul de familie **`e4-audit`**. v2 §7: descrierea confirmată este **„specializează familia”** — ancorare în familia semantică audit E4 fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

Muchiile **`dependency`** din v2 §7: `audit-data-anonymize-hitl-approval-contract-clause.md`, `audit-data-anonymize-hitl-approval-credit-limit.md`, `audit-data-anonymize-hitl-approval-credit-override.md`, `audit-data-anonymize-hitl-approval-refund-large.md`, `audit-data-anonymize-hitl-approval-return.md`, `audit-data-anonymize-hitl-escalation-overdue.md`, `audit-data-anonymize-hitl-investigation-payment.md`, `audit-data-anonymize-hitl-task-call-client.md`, `audit-data-anonymize-hitl-task-resolve.md`.

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

- **Planificare:** v2 §7 — `audit-data-anonymize` → `e4-audit`.
- **Runtime (ADR-0001):** **`audit:data:anonymize`** — vezi `QUEUES.E4_AUDIT_DATA_ANONYMIZE` și contractul neuron.
- **Semantic (ADR-0002):** chei catalog / span — vezi secțiunea de nealiniere din [`audit--data--anonymize.md`](../../../neurons/E4/audit--data--anonymize.md); eticheta **`e4-audit`** rămâne agregat de graf.

## Limite și reconcilieri

- **Muchie `default` vs detaliu operațional:** anonimizarea, cron-ul și câmpurile PII sunt în contractul neuron și în cod J47, nu în câmpurile sinapsei din registrul v2.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`audit-data-anonymize-family\``.
