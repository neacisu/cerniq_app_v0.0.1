# Sinapsă `alert-internal-campaign-launched-compliance-data-anonymize`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-campaign-launched-compliance-data-anonymize` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-campaign-launched/alert-internal-campaign-launched-compliance-data-anonymize.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-campaign-launched` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-internal-campaign-launched` | [`../../../neurons/E5/alert--internal--campaign-launched.md`](../../../neurons/E5/alert--internal--campaign-launched.md). **Runtime:** vezi family; gap literal v2 / apropiere `alerts:campaign:trigger` (L631). |
| Target | `compliance-data-anonymize` | [`../../../neurons/E4/compliance--data--anonymize.md`](../../../neurons/E4/compliance--data--anonymize.md). **Runtime:** în registry, coada executabilă este **`audit:data:anonymize`** (`QUEUES.E4_AUDIT_DATA_ANONYMIZE`, `queue-registry.ts` L485); v2 folosește eticheta `compliance:data:anonymize` — **nu** același literal; vezi contract neuron (mirror `audit--data--anonymize`). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Anonimizarea datelor (nod `compliance-data-anonymize` în planificare) este dependentă în graf de traseul alertei de lansare campanie. Legătura este declarativă în export; nu implică un payload sau un contract de date din v2.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap/apropiere campaign-trigger; țintă — `audit:data:anonymize` (J47).
- **Semantic (ADR-0002):** `e4:audit:data-anonymize` — vezi catalog și contracte neuroni țintă.
- **Planificare:** v2 §7 — `alert-internal-campaign-launched` → `compliance-data-anonymize`.

## Limite și reconcilieri

- Etichetă graf `compliance-data-anonymize` vs nume coadă `audit:data:anonymize` — documentat în contractul neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-campaign-launched-compliance-data-anonymize\``.
