# Sinapsă `bronze-dedup-hash-checker-bronze-ingest-json-parser`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-dedup-hash-checker-bronze-ingest-json-parser` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-dedup-hash-checker/bronze-dedup-hash-checker-bronze-ingest-json-parser.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-dedup-hash-checker` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `bronze-dedup-hash-checker` | **Contract:** [`../../../neurons/E1/bronze--dedup--hash-checker.md`](../../../neurons/E1/bronze--dedup--hash-checker.md). |
| Destinație (graf) | `bronze-ingest-json-parser` | **Contract:** [`../../../neurons/E1/bronze--ingest--json-parser.md`](../../../neurons/E1/bronze--ingest--json-parser.md). **Traseu sinapse:** [`../bronze-ingest-json-parser/`](../bronze-ingest-json-parser/). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **bronze-dedup-hash-checker** depinde de **bronze-ingest-json-parser**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** vezi contractele neuron pentru ambele capete și `queue-registry.ts`.
- **Semantic (ADR-0002):** etapa E1 — cataloage în neuroni.
- **Planificare:** v2 §7 — `bronze-dedup-hash-checker` → `bronze-ingest-json-parser`.

## Limite și reconcilieri

- Acest fișier documentează **doar** muchia din v2 §7; maparea completă runtime pentru JSON ingest este în [`../../../neurons/E1/bronze--ingest--json-parser.md`](../../../neurons/E1/bronze--ingest--json-parser.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-dedup-hash-checker-bronze-ingest-json-parser\``.
