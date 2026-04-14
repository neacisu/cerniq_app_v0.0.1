# Sinapsă `stock-reserve-release-guardrail-stock-verify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-reserve-release-guardrail-stock-verify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-reserve-release/stock-reserve-release-guardrail-stock-verify.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-reserve-release` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `stock-reserve-release` | **Contract:** [`../../../neurons/E3/stock--reserve--release.md`](../../../neurons/E3/stock--reserve--release.md). **Triplă autoritate:** v2 `stock:reserve:release`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `guardrail-stock-verify` | **Contract:** [`../../../neurons/E3/guardrail--stock--verify.md`](../../../neurons/E3/guardrail--stock--verify.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **stock-reserve-release** are dependență canonică de pipeline față de **guardrail-stock-verify**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `stock-reserve-release` → `guardrail-stock-verify`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L175**; **Destinație (coadă):** `guardrail:stock:verify` la **L147** (`queue_in_registry` = `no` — vezi contract neuron).
- **Runtime:** vezi neuronii.

## Limite și reconcilieri

- Diferența semantică față de `guardrail-stock-check` în fluxul real trebuie dedusă din implementare; muchia nu o fixează.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-reserve-release-guardrail-stock-verify\``.
