# Sinapsă `audit-log-write-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `audit-log-write-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/audit-log-write/audit-log-write-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `audit-log-write` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `audit-log-write` | Nod de traseu în graf. **Matrix / neuron:** [`../../../neurons/E4/audit--log--write.md`](../../../neurons/E4/audit--log--write.md) — `audit:log:write` (E4, audit). Contractul neuron documentează **J45**, coada **`audit:log:write`** în `queue-registry.ts` (`QUEUES.E4_AUDIT_LOG_WRITE`), `concurrency: 1`, și nealiniere posibilă între chei catalog și string-ul `withCognitiveSpan`. |
| Destinație (graf) | `e4-audit` | Agregat **familie audit E4** în planificare; nu este o singură coadă executabilă și **nu** există un fișier neuron unic pentru eticheta agregată `e4-audit`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** leagă traseul **audit-log-write** de nucleul de familie **`e4-audit`**. v2 §7: descrierea confirmată este **„specializează familia”** — ancorare în familia semantică audit E4 fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

Muchiile **`dependency`** din v2 §7: `audit-log-write-hitl-approval-contract-clause.md`, `audit-log-write-hitl-approval-credit-limit.md`, `audit-log-write-hitl-approval-credit-override.md`, `audit-log-write-hitl-approval-refund-large.md`, `audit-log-write-hitl-approval-return.md`, `audit-log-write-hitl-escalation-overdue.md`, `audit-log-write-hitl-investigation-payment.md`, `audit-log-write-hitl-task-call-client.md`, `audit-log-write-hitl-task-resolve.md`.

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

- **Planificare:** v2 §7 — `audit-log-write` → `e4-audit`.
- **Runtime (ADR-0001):** **`audit:log:write`** — vezi registry și J45 în contractul neuron.
- **Semantic (ADR-0002):** chei `e4:audit:log-write` vs span `e4:audit:log:write` — vezi [`audit--log--write.md`](../../../neurons/E4/audit--log--write.md); eticheta **`e4-audit`** rămâne agregat de graf.

## Limite și reconcilieri

- **Serializare hash-chain:** detaliile de concurrency și DB sunt în codul J45 și în contractul neuron, nu în câmpurile sinapsei v2.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`audit-log-write-family\``.
