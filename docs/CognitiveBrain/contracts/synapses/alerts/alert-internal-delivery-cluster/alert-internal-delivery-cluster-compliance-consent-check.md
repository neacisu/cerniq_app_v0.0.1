# Sinapsă `alert-internal-delivery-cluster-compliance-consent-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-delivery-cluster-compliance-consent-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-delivery-cluster/alert-internal-delivery-cluster-compliance-consent-check.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-delivery-cluster` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-internal-delivery-cluster` | **Contract:** [`../../../neurons/E5/alert--internal--delivery-cluster.md`](../../../neurons/E5/alert--internal--delivery-cluster.md). **Runtime:** v2 `alert:internal:delivery-cluster` fără literal în registry la audit — vezi contract. |
| Destinație (graf) | `compliance-consent-check` | **Contract:** [`../../../neurons/E5/compliance--consent--check.md`](../../../neurons/E5/compliance--consent--check.md). **Mapare runtime:** apropiere K56 `compliance:gdpr:check` (`E5_COMPLIANCE_GDPR_CHECK`) — vezi contract neuron; **nu** echivalență 1:1 cu numele v2. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Alerta internă cluster livrări** este legată canonic de **verificarea consimțământului (conformitate)**. v2: **„sinapsă canonică de pipeline”**; exportul nu detaliază canalul sau baza legală.

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

- **Runtime (ADR-0001):** sursă cu gap vs K56 / cozi consent — vezi contract țintă.
- **Semantic (ADR-0002):** alerts E5 vs compliance.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Cluster livrări vs verificare referral/consimțământ: legătura este numai în graful exportat până la dovadă în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-delivery-cluster-compliance-consent-check\``.
