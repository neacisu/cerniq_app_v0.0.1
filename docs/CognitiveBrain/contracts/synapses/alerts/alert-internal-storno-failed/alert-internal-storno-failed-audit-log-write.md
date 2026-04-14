# Sinapsă `alert-internal-storno-failed-audit-log-write`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-storno-failed-audit-log-write` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-storno-failed/alert-internal-storno-failed-audit-log-write.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-storno-failed` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-internal-storno-failed` | **Contract:** [`../../../neurons/E4/alert--internal--storno-failed.md`](../../../neurons/E4/alert--internal--storno-failed.md). **Runtime:** v2 `alert:internal:storno-failed` fără literal în cod la audit — vezi contract. |
| Destinație (graf) | `audit-log-write` | **Registry:** `E4_AUDIT_LOG_WRITE` -> `audit:log:write` (J45). **Contract:** [`../../../neurons/E4/audit--log--write.md`](../../../neurons/E4/audit--log--write.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Alerta internă (eșec storno)** este legată canonic de **scrierea în jurnalul audit** (J45). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie payload-ul înregistrării.

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

- **Runtime (ADR-0001):** sursă cu gap vs `audit:log:write` prezent în registry.
- **Semantic (ADR-0002):** alerts E4 vs audit E4.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Prezența cozii J45 în registry nu dovedește singură că alerta granulară v2 populează acel jurnal.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-storno-failed-audit-log-write\``.
