# Sinapsă `silver-norm-address-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-norm-address-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-norm-address/silver-norm-address-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-norm-address` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `silver-norm-address` | Traseu în graf; contract neuron: [`../../../neurons/E1/silver--norm--address.md`](../../../neurons/E1/silver--norm--address.md). **Triplă autoritate:** v2 **`silver:norm:address`**; runtime `normalize:address` / `e1:normalize:address` — vezi neuron; `NEURON_MATRIX.csv`: **`e1:normalize:address`**. |
| Destinație (graf) | `e1-normalize` | Agregat **familie normalize E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/normalize.md`](../../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **silver-norm-address** sub agregatul **`e1-normalize`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

`silver-norm-address-enrich-anaf-address.md` … `silver-norm-address-enrich-web-tech-detect.md` (36 muchii `dependency` către trasee `enrich-*`; vezi același director).

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

- **Planificare:** v2 §7 — `silver-norm-address` → `e1-normalize`.
- **Runtime (ADR-0001):** `e1-normalize` nu este cheie în `QUEUES`; normalizare adresă — vezi `QUEUES.NORMALIZE_ADDRESS` în `workers/shared/src/queue-registry.ts`.
- **Semantic (ADR-0002):** `e1:normalize:address` — vezi catalog.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Denumire v2 `silver:norm:*` poate diferi de `queueName` — vezi contractul neuronului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-norm-address-family\``.
