# Sinapsă `alert-internal-campaign-launched-compliance-optout-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-campaign-launched-compliance-optout-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-campaign-launched/alert-internal-campaign-launched-compliance-optout-process.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-campaign-launched` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-internal-campaign-launched` | [`../../../neurons/E5/alert--internal--campaign-launched.md`](../../../neurons/E5/alert--internal--campaign-launched.md). **Runtime:** vezi family; gap literal v2 / apropiere `alerts:campaign:trigger` (L631). |
| Target | `compliance-optout-process` | [`../../../neurons/E5/compliance--optout--process.md`](../../../neurons/E5/compliance--optout--process.md). **Runtime:** **gap** pentru `compliance:optout:process` în `queue-registry.ts`; logică înrudită în workeri outreach (email/SMS/WhatsApp) — **nu** coadă unică E5; vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Procesarea opt-out declarată în graf (`compliance-optout-process`) este dependentă de traseul alertei de lansare campanie. Exportul nu specifică cum se propagă evenimentele între alertă și fluxul de opt-out.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap/apropiere campaign-trigger; țintă — gap `compliance:optout:process`.
- **Semantic (ADR-0002):** fără `nodeKey` dedicat în catalog pentru coada v2; vezi contract neuron.
- **Planificare:** v2 §7 — `alert-internal-campaign-launched` → `compliance-optout-process`.

## Limite și reconcilieri

- Opt-out dispersat în outreach vs nod unic în graf — vezi contract neuron țintă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-campaign-launched-compliance-optout-process\``.
