# Sinapsă `alert-internal-campaign-launched-compliance-consent-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-campaign-launched-compliance-consent-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-campaign-launched/alert-internal-campaign-launched-compliance-consent-check.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-campaign-launched` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-internal-campaign-launched` | [`../../../neurons/E5/alert--internal--campaign-launched.md`](../../../neurons/E5/alert--internal--campaign-launched.md). **Runtime:** vezi family; gap literal v2 / apropiere `alerts:campaign:trigger` (L631). |
| Target | `compliance-consent-check` | [`../../../neurons/E5/compliance--consent--check.md`](../../../neurons/E5/compliance--consent--check.md). **Runtime:** coada v2 `compliance:consent:check` **nu** e literal în registry; mapare documentată: **`compliance:gdpr:check`** (`QUEUES.E5_COMPLIANCE_GDPR_CHECK`, `queue-registry.ts` L634) — **nu** echivalență de nume 1:1; vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Verificarea de conformitate legată de consent (nod `compliance-consent-check` în graf) este dependentă de traseul alertei de lansare campanie. Fără detaliu de orchestrare din export.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap/apropiere campaign-trigger; țintă nominală v2 — `compliance:consent:check`; execuție apropiată — `compliance:gdpr:check` (K56).
- **Semantic (ADR-0002):** `e5:compliance:gdpr-check` — vezi catalog și contract neuron țintă.
- **Planificare:** v2 §7 — `alert-internal-campaign-launched` → `compliance-consent-check`.

## Limite și reconcilieri

- Nume v2 `compliance:consent:check` vs coadă `compliance:gdpr:check` — explicit în contractul neuron țintă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-campaign-launched-compliance-consent-check\``.
