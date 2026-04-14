# Sinapsă `alert-internal-campaign-launched-compliance-audit-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-campaign-launched-compliance-audit-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-campaign-launched/alert-internal-campaign-launched-compliance-audit-generate.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-campaign-launched` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-internal-campaign-launched` | [`../../../neurons/E5/alert--internal--campaign-launched.md`](../../../neurons/E5/alert--internal--campaign-launched.md). **Runtime:** coada v2 **nu** e literal în registry; apropiere `alerts:campaign:trigger` (L631) — vezi contract neuron. |
| Target | `compliance-audit-generate` | [`../../../neurons/E5/compliance--audit--generate.md`](../../../neurons/E5/compliance--audit--generate.md). **Runtime:** **gap** pentru `compliance:audit:generate` în `queue-registry.ts`; operațional apropiat K56–K58 — **nu** înlocuitor 1:1; vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În graful de planificare, fluxul către generarea auditului de conformitate (`compliance-audit-generate`) este dependent de traseul alertei interne de lansare campanie. Exportul **nu** descrie mecanismul de date sau ordinea de execuție în runtime.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap/apropiere `alerts:campaign:trigger`; țintă — gap `compliance:audit:generate`.
- **Semantic (ADR-0002):** `e5:compliance:*` vs neuronțintă — vezi contracte.
- **Planificare:** v2 §7 — `alert-internal-campaign-launched` → `compliance-audit-generate`.

## Limite și reconcilieri

- Ambele capete au nealiniere graf ↔ cozi dedicate; reconcilierea este în contractele neuroni, fără presupuneri noi aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-campaign-launched-compliance-audit-generate\``.
